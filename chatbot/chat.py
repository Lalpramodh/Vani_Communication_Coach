import copy
import re
import threading
import uuid
from datetime import datetime, timezone

from chatbot.groq_client import generate_response
from chatbot.prompts import build_chat_system_prompt
from communication.evaluator import evaluate_conversation
from communication.feedback import build_fallback_reply
from communication.scoring import build_coach_tip, score_answer, weakest_metric
from config import DEFAULT_MODE_ID, PRACTICE_MODE_MAP
from database.queries import store_completed_session, store_message
from rag.vector_store import retrieve_relevant_chunks

_ACTIVE_SESSIONS = {}
_LOCK = threading.Lock()


def _mode_for(mode_id):
    return PRACTICE_MODE_MAP.get(mode_id) or PRACTICE_MODE_MAP[DEFAULT_MODE_ID]


def _is_open_ended_mode(mode):
    return bool(mode.get("isOpenEnded"))


def _session_complete(state, mode):
    if _is_open_ended_mode(mode):
        return bool(state.get("wrappedUp"))
    return state["turnIndex"] >= len(mode["questions"])


def _opening_message(mode):
    opening_line = str(mode.get("openingLine") or "").strip()
    if opening_line:
        return opening_line

    questions = mode.get("questions") or []
    if questions:
        return f"Let's begin. {questions[0]}"
    return "Let's begin."


def _normalize_control_text(value):
    return " ".join(re.sub(r"[^a-z0-9\s]", " ", str(value or "").lower()).split())


def _stop_requested(mode, message):
    if not _is_open_ended_mode(mode):
        return False

    normalized_message = _normalize_control_text(message)
    phrases = [mode.get("stopPhrase")] + list(mode.get("stopPhrases") or [])

    for phrase in phrases:
        normalized_phrase = _normalize_control_text(phrase)
        if normalized_phrase and normalized_phrase in normalized_message:
            return True

    return False


def _current_prompt(mode, state):
    if _is_open_ended_mode(mode):
        for entry in reversed(state.get("transcript") or []):
            if entry.get("role") == "assistant":
                return str(entry.get("content") or "").strip()
        return (mode.get("questions") or [mode.get("scenario") or "Start the conversation."])[0]

    return mode["questions"][state["turnIndex"]]


def _next_direction(mode, state):
    questions = mode.get("questions") or []

    if _is_open_ended_mode(mode):
        if questions:
            return questions[state["turnIndex"] % len(questions)]
        return None

    return questions[state["turnIndex"]] if state["turnIndex"] < len(questions) else None


def _now_iso():
    return datetime.now(timezone.utc).isoformat()


def _initial_scores():
    return {
        "grammar": 0,
        "vocabulary": 0,
        "confidence": 0,
        "clarity": 0,
        "professionalism": 0,
    }


def _create_state(mode_id):
    mode = _mode_for(mode_id)
    created_at = _now_iso()
    return {
        "id": str(uuid.uuid4()),
        "modeId": mode["id"],
        "startedAt": created_at,
        "turnIndex": 0,
        "wrappedUp": False,
        "answers": [],
        "transcript": [
            {
                "role": "assistant",
                "content": _opening_message(mode),
                "createdAt": created_at,
            }
        ],
        "latestScores": _initial_scores(),
        "coachTip": mode["coachTip"],
    }


def get_or_start_session(user_id, mode_id=None, restart=False):
    first_message = None
    with _LOCK:
        current = _ACTIVE_SESSIONS.get(user_id)
        requested_mode = mode_id or (current or {}).get("modeId") or DEFAULT_MODE_ID
        if restart or not current or current.get("modeId") != requested_mode:
            current = _create_state(requested_mode)
            _ACTIVE_SESSIONS[user_id] = current
            first_message = current["transcript"][0]
        response_state = copy.deepcopy(current)

    if first_message:
        store_message(response_state["id"], user_id, first_message["role"], first_message["content"], first_message["createdAt"])

    return response_state


def _build_groq_messages(mode, transcript, next_question, retrieved_chunks, should_wrap_up=False):
    messages = [
        {
            "role": "system",
            "content": build_chat_system_prompt(
                mode,
                retrieved_chunks,
                next_question,
                should_wrap_up=should_wrap_up,
            ),
        }
    ]
    for entry in transcript:
        messages.append({"role": entry["role"], "content": entry["content"]})
    return messages


def process_user_message(user_id, user_message):
    message = str(user_message or "").strip()
    if not message:
        raise ValueError("Write a message before sending.")

    initial_message = None
    with _LOCK:
        state = _ACTIVE_SESSIONS.get(user_id)
        if not state:
            state = _create_state(DEFAULT_MODE_ID)
            _ACTIVE_SESSIONS[user_id] = state
            initial_message = state["transcript"][0]

        mode = _mode_for(state["modeId"])
        if _session_complete(state, mode):
            raise ValueError("This session is already complete.")

        stop_requested = _stop_requested(mode, message)
        needs_first_reply = stop_requested and not state["answers"]
        should_wrap_up = stop_requested and not needs_first_reply
        created_at = _now_iso()
        scores = dict(state["latestScores"])

        if not should_wrap_up and not needs_first_reply:
            current_question = _current_prompt(mode, state)
            scores = score_answer(message, question=current_question, mode=mode)
            state["answers"].append(
                {
                    "question": current_question,
                    "answer": message,
                    "scores": scores,
                }
            )
            state["latestScores"] = scores
            state["coachTip"] = build_coach_tip(weakest_metric(scores))
            state["turnIndex"] += 1

        state["transcript"].append({"role": "user", "content": message, "createdAt": created_at})
        session_id = state["id"]

        if should_wrap_up:
            state["wrappedUp"] = True
            next_question = None
        else:
            next_question = _next_direction(mode, state)

        transcript_for_model = copy.deepcopy(state["transcript"])

    if initial_message:
        store_message(session_id, user_id, initial_message["role"], initial_message["content"], initial_message["createdAt"])
    store_message(session_id, user_id, "user", message, created_at)

    if needs_first_reply:
        assistant_reply = (
            "We can wrap up anytime. Share one real message first so I have something to coach, "
            "then say 'ok stop the chat' whenever you want to finish."
        )
    else:
        retrieved_chunks = retrieve_relevant_chunks(message)

        try:
            assistant_reply = generate_response(
                _build_groq_messages(
                    mode,
                    transcript_for_model,
                    next_question,
                    retrieved_chunks,
                    should_wrap_up=should_wrap_up,
                )
            )
        except Exception:
            assistant_reply = build_fallback_reply(
                scores,
                next_question,
                mode=mode,
                should_wrap_up=should_wrap_up,
            )

    assistant_created_at = _now_iso()

    with _LOCK:
        current_state = _ACTIVE_SESSIONS.get(user_id)
        if not current_state or current_state["id"] != session_id:
            raise ValueError("This practice session changed. Please refresh and try again.")

        current_state["transcript"].append(
            {
                "role": "assistant",
                "content": assistant_reply,
                "createdAt": assistant_created_at,
            }
        )
        response_state = copy.deepcopy(current_state)

    store_message(session_id, user_id, "assistant", assistant_reply, assistant_created_at)

    return {
        "session": response_state,
        "isComplete": _session_complete(response_state, mode),
    }


def finish_session(user_id):
    with _LOCK:
        state = _ACTIVE_SESSIONS.get(user_id)
        if not state or not state["answers"]:
            raise ValueError("Answer at least one prompt before finishing.")

        session_id = state["id"]
        mode = _mode_for(state["modeId"])
        answers = copy.deepcopy(state["answers"])
        transcript = copy.deepcopy(state["transcript"])
        started_at = datetime.fromisoformat(state["startedAt"].replace("Z", "+00:00"))

    now = datetime.now(timezone.utc)
    duration_minutes = max(1, round((now - started_at).total_seconds() / 60))
    report_data = evaluate_conversation(mode, transcript, answers)
    saved_session = store_completed_session(
        user_id=user_id,
        mode_id=mode["id"],
        report_data=report_data,
        transcript=transcript,
        duration_minutes=duration_minutes,
        session_id=session_id,
    )

    with _LOCK:
        current_state = _ACTIVE_SESSIONS.get(user_id)
        if current_state and current_state["id"] == session_id:
            del _ACTIVE_SESSIONS[user_id]

    return saved_session

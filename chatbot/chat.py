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
from config import CUSTOM_SCENARIO_ID, DEFAULT_MODE_ID, MODE_ALIASES, PRACTICE_MODE_MAP
from database.queries import store_completed_session, store_message
from rag.vector_store import retrieve_relevant_chunks

_ACTIVE_SESSIONS = {}
_LOCK = threading.Lock()


def _mode_for(mode_id, scenario_text=None):
    resolved_id = MODE_ALIASES.get(mode_id, mode_id)
    mode = copy.deepcopy(PRACTICE_MODE_MAP.get(resolved_id) or PRACTICE_MODE_MAP[DEFAULT_MODE_ID])

    if mode["id"] == CUSTOM_SCENARIO_ID:
        scenario = str(scenario_text or "").strip()
        if scenario:
            inferred = _infer_custom_role(scenario)
            mode["scenario"] = scenario
            mode["assistantRole"] = inferred["assistantRole"]
            mode["userRole"] = inferred["userRole"]
            mode["openingLine"] = inferred["openingLine"]
            mode["challengeStyle"] = inferred["challengeStyle"]
            mode["evaluationFocus"] = inferred["evaluationFocus"]
            mode["inferredRole"] = inferred["inferredRole"]

    return mode


def _infer_custom_role(scenario_text):
    text = _normalize_control_text(scenario_text)

    candidates = [
        (
            ("salary", "negotiate", "raise", "compensation"),
            {
                "assistantRole": "manager",
                "userRole": "employee",
                "openingLine": "Tell me what you want to discuss, and I’ll respond like your manager would in the meeting.",
                "challengeStyle": "Push for clarity, impact, and a concrete ask.",
                "evaluationFocus": "negotiation",
                "inferredRole": "manager conversation",
            },
        ),
        (
            ("interview", "job", "hiring", "recruiter", "application"),
            {
                "assistantRole": "interviewer",
                "userRole": "candidate",
                "openingLine": "Let’s roleplay the interview. Start with your first answer and I’ll respond like the interviewer.",
                "challengeStyle": "Ask follow-up questions that probe structure, confidence, and fit.",
                "evaluationFocus": "interview readiness",
                "inferredRole": "interview",
            },
        ),
        (
            ("client", "customer", "presentation", "proposal", "meeting"),
            {
                "assistantRole": "client",
                "userRole": "account lead",
                "openingLine": "Walk me through the situation, and I’ll respond like the client in the room.",
                "challengeStyle": "Be commercially realistic, skeptical, and detail-oriented.",
                "evaluationFocus": "client communication",
                "inferredRole": "client roleplay",
            },
        ),
        (
            ("manager", "boss", "lead", "approval", "leave", "project"),
            {
                "assistantRole": "manager",
                "userRole": "team member",
                "openingLine": "Tell me what you want to say, and I’ll play the manager side of the conversation.",
                "challengeStyle": "Keep it practical and ask for a direct, respectful ask.",
                "evaluationFocus": "manager communication",
                "inferredRole": "manager discussion",
            },
        ),
        (
            ("difficulty", "difficult conversation", "conflict", "issue", "feedback"),
            {
                "assistantRole": "the other person",
                "userRole": "conversation lead",
                "openingLine": "Go ahead and set up the conversation. I’ll respond like the other person involved.",
                "challengeStyle": "Stay realistic, slightly guarded, and emotionally believable.",
                "evaluationFocus": "difficult conversations",
                "inferredRole": "difficult conversation",
            },
        ),
    ]

    for keywords, payload in candidates:
        if any(keyword in text for keyword in keywords):
            return payload

    return {
        "assistantRole": "adaptive roleplay partner",
        "userRole": "scenario owner",
        "openingLine": "Tell me the situation you want to practice, and I’ll stay in character with the other side of it.",
        "challengeStyle": "Infer the most likely role from the user's description and keep the exchange natural.",
        "evaluationFocus": "custom roleplay",
        "inferredRole": "adaptive scenario",
    }


def _is_open_ended_mode(mode):
    return True


def _session_complete(state, mode):
    return bool(state.get("wrappedUp"))


def _opening_message(mode):
    opening_line = str(mode.get("openingLine") or "").strip()
    if opening_line:
        return opening_line

    return f"Let's begin the {mode['title'].lower()} roleplay."


def _normalize_control_text(value):
    return " ".join(re.sub(r"[^a-z0-9\s]", " ", str(value or "").lower()).split())


def _stop_requested(mode, message):
    normalized_message = _normalize_control_text(message)
    phrases = [
        mode.get("stopPhrase"),
        "finish session",
        "end session",
        "wrap up",
        "stop roleplay",
    ] + list(mode.get("stopPhrases") or [])

    for phrase in phrases:
        normalized_phrase = _normalize_control_text(phrase)
        if normalized_phrase and normalized_phrase in normalized_message:
            return True

    return False


def _current_prompt(mode, state):
    for entry in reversed(state.get("transcript") or []):
        if entry.get("role") == "assistant":
            return str(entry.get("content") or "").strip()
    return str(mode.get("openingLine") or mode.get("scenario") or "Start the roleplay.").strip()


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


def _create_state(mode_id, scenario_text=None):
    mode = _mode_for(mode_id, scenario_text=scenario_text)
    created_at = _now_iso()
    return {
        "id": str(uuid.uuid4()),
        "modeId": mode["id"],
        "mode": mode,
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


def get_or_start_session(user_id, mode_id=None, restart=False, scenario_text=None):
    first_message = None
    with _LOCK:
        current = _ACTIVE_SESSIONS.get(user_id)
        requested_mode = mode_id or (current or {}).get("modeId") or DEFAULT_MODE_ID
        resolved_mode_id = MODE_ALIASES.get(requested_mode, requested_mode)
        if restart or not current or current.get("modeId") != resolved_mode_id:
            current = _create_state(requested_mode, scenario_text=scenario_text)
            _ACTIVE_SESSIONS[user_id] = current
            first_message = current["transcript"][0]
        elif resolved_mode_id == CUSTOM_SCENARIO_ID and scenario_text and current.get("mode", {}).get("scenario") != scenario_text:
            current = _create_state(requested_mode, scenario_text=scenario_text)
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

        mode = state.get("mode") or _mode_for(state["modeId"])
        if _session_complete(state, mode):
            raise ValueError("This session is already complete.")

        stop_requested = _stop_requested(mode, message)
        needs_first_reply = stop_requested and not state["answers"]
        should_wrap_up = stop_requested and not needs_first_reply
        created_at = _now_iso()
        scores = dict(state["latestScores"])
        current_prompt = _current_prompt(mode, state)

        if not should_wrap_up and not needs_first_reply:
            scores = score_answer(message, question=current_prompt, mode=mode)
            state["answers"].append(
                {
                    "question": current_prompt,
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
        else:
            next_question = current_prompt

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
        retrieval_query = " ".join(
            [
                message,
                str(mode.get("title") or ""),
                str(mode.get("scenario") or ""),
                str(mode.get("assistantRole") or ""),
            ]
        ).strip()
        retrieved_chunks = retrieve_relevant_chunks(retrieval_query)

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

        current_state["mode"] = mode
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
        mode = state.get("mode") or _mode_for(state["modeId"])
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

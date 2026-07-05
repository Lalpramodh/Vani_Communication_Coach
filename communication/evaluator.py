import json

from chatbot.groq_client import generate_response
from chatbot.prompts import build_evaluation_messages
from communication.feedback import build_fallback_report
from config import GROQ_EVALUATION_MODEL
from rag.vector_store import retrieve_relevant_chunks

LIST_FIELDS = [
    "strengths",
    "weaknesses",
    "suggestions",
    "grammar_issues",
    "clarity_issues",
    "top_improvements",
]

STRING_FIELDS = [
    "communication_level",
    "improved_version",
    "coaching_tip",
    "next_prompt",
    "summary",
    "professionalism_notes",
]

SCORE_FIELDS = [
    "overall_score",
    "grammar",
    "confidence",
    "clarity",
    "vocabulary",
    "professionalism",
]


def _extract_json_payload(raw_text):
    text = str(raw_text or "").strip()
    if text.startswith("```"):
        lines = text.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        text = "\n".join(lines).strip()
    start = text.find("{")
    end = text.rfind("}")
    if start >= 0 and end > start:
        text = text[start : end + 1]
    return json.loads(text)


def _normalize_list(value):
    if value is None:
        return []
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str):
        stripped = value.strip()
        return [stripped] if stripped else []
    return [str(value).strip()]


def _normalize_report(report):
    normalized = dict(report or {})
    for key in SCORE_FIELDS:
        normalized[key] = max(0, min(100, int(round(float(normalized.get(key, 0))))))
    for key in LIST_FIELDS:
        normalized[key] = _normalize_list(normalized.get(key))
    for key in STRING_FIELDS:
        value = normalized.get(key)
        if isinstance(value, list):
            value = " ".join(str(item).strip() for item in value if str(item).strip())
        normalized[key] = str(value or "").strip()
    return normalized


def _merge_reports(baseline, candidate):
    merged = dict(baseline)
    normalized_candidate = _normalize_report(candidate)

    for key in STRING_FIELDS:
        if normalized_candidate.get(key):
            merged[key] = normalized_candidate[key]

    for key in LIST_FIELDS:
        if normalized_candidate.get(key):
            merged[key] = normalized_candidate[key]

    merged["suggestions"] = merged.get("top_improvements") or merged.get("suggestions") or []
    return merged


def evaluate_conversation(mode, transcript, answers):
    baseline = build_fallback_report(mode, transcript, answers)
    query_text = " ".join(
        [
            str(mode.get("title") or ""),
            str(mode.get("scenario") or ""),
            " ".join(str(item.get("question") or "") for item in (answers or [])),
            " ".join(str(item.get("answer") or "") for item in (answers or [])),
        ]
    ).strip()
    retrieved_chunks = retrieve_relevant_chunks(query_text, top_k=3)

    try:
        raw_response = generate_response(
            build_evaluation_messages(mode, transcript, baseline, retrieved_chunks),
            model=GROQ_EVALUATION_MODEL,
            temperature=0.1,
        )
        return _merge_reports(baseline, _extract_json_payload(raw_response))
    except Exception:
        return baseline

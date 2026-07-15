import json
from datetime import datetime, timezone

from postgrest.exceptions import APIError


from config import (
    DEFAULT_COMMUNICATION_GOAL,
    DEFAULT_EXPERIENCE_LEVEL,
    DEFAULT_MODE_ID,
    MODE_ALIASES,
    PRACTICE_MODE_MAP,
)
from database.supabase import create_public_client, get_service_client

_MESSAGES_TABLE_AVAILABLE = None


def _mode_for(mode_id):
    resolved_id = MODE_ALIASES.get(mode_id, mode_id)
    return PRACTICE_MODE_MAP.get(resolved_id) or PRACTICE_MODE_MAP[DEFAULT_MODE_ID]


def _humanize_name_from_email(email):
    local = str(email or "learner").split("@", 1)[0]
    parts = [part for part in local.replace(".", " ").replace("_", " ").replace("-", " ").split() if part]
    return " ".join(part.capitalize() for part in parts) or "Learner"


def _safe_int(value, default=0):
    try:
        return int(round(float(value)))
    except (TypeError, ValueError):
        return default


def _normalize_string_list(value):
    if value is None:
        return []
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str):
        stripped = value.strip()
        if not stripped:
            return []
        try:
            parsed = json.loads(stripped)
        except json.JSONDecodeError:
            return [item.strip() for item in stripped.split("\n") if item.strip()]
        if isinstance(parsed, list):
            return [str(item).strip() for item in parsed if str(item).strip()]
        return [str(parsed).strip()]
    return [str(value).strip()]


def normalize_user_profile(row):
    row = row or {}
    return {
        "id": row.get("id"),
        "name": row.get("full_name") or _humanize_name_from_email(row.get("email")),
        "email": row.get("email", ""),
        "goal": row.get("communication_goal") or DEFAULT_COMMUNICATION_GOAL,
        "stage": row.get("experience_level") or DEFAULT_EXPERIENCE_LEVEL,
        "profileImage": row.get("profile_image") or "",
    }


def get_user_profile(user_id):
    if not user_id:
        return None
    service = get_service_client()
    response = service.table("user_profiles").select("*").eq("id", user_id).limit(1).execute()
    if not response.data:
        return None
    return normalize_user_profile(response.data[0])


def ensure_user_profile(user_id, email, full_name=None):
    existing = get_user_profile(user_id)
    if existing:
        return existing

    payload = {
        "id": user_id,
        "full_name": full_name or _humanize_name_from_email(email),
        "email": email,
        "communication_goal": DEFAULT_COMMUNICATION_GOAL,
        "experience_level": DEFAULT_EXPERIENCE_LEVEL,
        "profile_image": "",
    }

    service = get_service_client()
    service.table("user_profiles").insert(payload).execute()
    return normalize_user_profile(payload)


def _auth_payload(auth_response, profile):
    return {
        "user_id": auth_response.user.id,
        "email": auth_response.user.email,
        "access_token": auth_response.session.access_token if auth_response.session else None,
        "refresh_token": auth_response.session.refresh_token if auth_response.session else None,
        "profile": profile,
    }


def _friendly_auth_error(error):
    message = str(error)
    if "already registered" in message.lower():
        return "An account with this email already exists."
    if "invalid login credentials" in message.lower():
        return "Invalid email or password."
    return message or "Authentication failed."


def create_user_account(email, password, full_name):
    service = get_service_client()
    public = create_public_client()
    created_user_id = None

    try:
        auth_response = service.auth.admin.create_user(
            {
                "email": email,
                "password": password,
                "email_confirm": True,
                "user_metadata": {"full_name": full_name},
            }
        )
        created_user_id = auth_response.user.id
        profile = ensure_user_profile(created_user_id, email, full_name)
        login_response = public.auth.sign_in_with_password({"email": email, "password": password})
        return _auth_payload(login_response, profile)
    except Exception as error:
        if created_user_id:
            try:
                service.auth.admin.delete_user(created_user_id)
            except Exception:
                pass
        raise ValueError(_friendly_auth_error(error)) from error
    except Exception:
        if created_user_id:
            try:
                service.auth.admin.delete_user(created_user_id)
            except Exception:
                pass
        raise


def authenticate_user(email, password):
    public = create_public_client()
    try:
        auth_response = public.auth.sign_in_with_password({"email": email, "password": password})
    except Exception as error:
        raise ValueError(_friendly_auth_error(error)) from error

    profile = ensure_user_profile(
        auth_response.user.id,
        auth_response.user.email,
        (auth_response.user.user_metadata or {}).get("full_name"),
    )
    return _auth_payload(auth_response, profile)


def _report_lookup(user_id):
    service = get_service_client()
    session_rows = (
        service.table("practice_sessions")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
        .data
    )
    session_rows = [row for row in session_rows if row.get("overall_score") is not None]

    if not session_rows:
        return [], {}

    session_ids = [row["id"] for row in session_rows]
    report_rows = service.table("reports").select("*").in_("session_id", session_ids).execute().data
    report_map = {row.get("session_id"): row for row in report_rows}
    return session_rows, report_map


def _normalize_session(row, report_row):
    mode = _mode_for(row.get("practice_mode"))
    report_json = (report_row or {}).get("report_json") or {}
    strengths = _normalize_string_list(row.get("strengths")) or _normalize_string_list(report_json.get("strengths"))
    weaknesses = _normalize_string_list(row.get("growth_areas")) or _normalize_string_list(report_json.get("weaknesses"))
    suggestions = _normalize_string_list(row.get("recommendations")) or _normalize_string_list(report_json.get("suggestions"))
    grammar_issues = _normalize_string_list(report_json.get("grammar_issues"))
    clarity_issues = _normalize_string_list(report_json.get("clarity_issues"))
    top_improvements = _normalize_string_list(report_json.get("top_improvements")) or suggestions
    breakdown = {
        "grammar": _safe_int(report_json.get("grammar", row.get("grammar"))),
        "vocabulary": _safe_int(report_json.get("vocabulary", row.get("vocabulary"))),
        "confidence": _safe_int(report_json.get("confidence", row.get("confidence"))),
        "clarity": _safe_int(report_json.get("clarity", row.get("clarity"))),
        "professionalism": _safe_int(report_json.get("professionalism", row.get("professionalism"))),
    }
    overall = _safe_int(report_json.get("overall_score", row.get("overall_score")))
    summary = str(report_json.get("summary") or row.get("coach_summary") or "").strip()
    transcript = report_json.get("transcript") or []
    communication_level = str(report_json.get("communication_level") or "").strip()
    professionalism_notes = str(report_json.get("professionalism_notes") or "").strip()
    improved_version = str(report_json.get("improved_version") or "").strip()
    coaching_tip = str(report_json.get("coaching_tip") or "").strip()
    next_prompt = str(report_json.get("next_prompt") or "").strip()

    return {
        "id": row.get("id"),
        "modeId": mode["id"],
        "title": mode["title"],
        "scenario": mode["scenario"],
        "date": row.get("created_at"),
        "durationMinutes": _safe_int(row.get("session_duration")),
        "overall": overall,
        "breakdown": breakdown,
        "summary": summary,
        "coachSummary": str(row.get("coach_summary") or summary).strip(),
        "strengths": strengths,
        "growthAreas": weaknesses,
        "recommendations": suggestions,
        "communicationLevel": communication_level,
        "grammarIssues": grammar_issues,
        "clarityIssues": clarity_issues,
        "professionalismNotes": professionalism_notes,
        "topImprovements": top_improvements,
        "improvedVersion": improved_version,
        "coachingTip": coaching_tip,
        "nextPrompt": next_prompt,
        "transcript": transcript,
        "report": {
            "overall_score": overall,
            "communication_level": communication_level,
            "grammar": breakdown["grammar"],
            "vocabulary": breakdown["vocabulary"],
            "confidence": breakdown["confidence"],
            "clarity": breakdown["clarity"],
            "professionalism": breakdown["professionalism"],
            "strengths": strengths,
            "weaknesses": weaknesses,
            "grammar_issues": grammar_issues,
            "clarity_issues": clarity_issues,
            "professionalism_notes": professionalism_notes,
            "top_improvements": top_improvements,
            "improved_version": improved_version,
            "coaching_tip": coaching_tip,
            "next_prompt": next_prompt,
            "suggestions": suggestions,
            "summary": summary,
            "transcript": transcript,
        },
    }


def list_user_sessions(user_id):
    session_rows, report_map = _report_lookup(user_id)
    return [_normalize_session(row, report_map.get(row["id"])) for row in session_rows]


def get_dashboard_data(user_id):
    sessions = list_user_sessions(user_id)
    latest = sessions[0] if sessions else None
    previous = sessions[1] if len(sessions) > 1 else None
    improvement_percent = 0
    if latest and previous and previous["overall"] > 0:
        improvement_percent = round(((latest["overall"] - previous["overall"]) / previous["overall"]) * 100)

    return {
        "latestSession": latest,
        "previousSession": previous,
        "improvementPercent": improvement_percent,
        "recentSessions": sessions[:3],
        "sessions": sessions,
    }


def get_report_data(user_id, session_id=None):
    sessions = list_user_sessions(user_id)
    if not sessions:
        return None

    target = None
    if session_id:
        target = next((session_data for session_data in sessions if session_data["id"] == session_id), None)
    if target is None:
        target = sessions[0]

    current_index = sessions.index(target)
    previous = sessions[current_index + 1] if current_index + 1 < len(sessions) else None

    return {
        "session": target,
        "previousSession": previous,
    }


def store_completed_session(user_id, mode_id, report_data, transcript, duration_minutes, session_id=None):
    mode = _mode_for(mode_id)
    service = get_service_client()

    session_payload = {
        "user_id": user_id,
        "practice_mode": mode["id"],
        "overall_score": report_data["overall_score"],
        "grammar": report_data["grammar"],
        "vocabulary": report_data["vocabulary"],
        "confidence": report_data["confidence"],
        "clarity": report_data["clarity"],
        "professionalism": report_data["professionalism"],
        "coach_summary": report_data["summary"],
        "strengths": report_data["strengths"],
        "growth_areas": report_data["weaknesses"],
        "recommendations": json.dumps(report_data["suggestions"]),
        "session_duration": duration_minutes,
    }
    if session_id:
        session_payload["id"] = session_id
    session_row = service.table("practice_sessions").insert(session_payload).execute().data[0]

    report_payload = {
        "session_id": session_row["id"],
        "report_json": {
            **report_data,
            "mode_id": mode["id"],
            "mode_title": mode["title"],
            "scenario": mode["scenario"],
            "transcript": transcript,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        },
    }
    report_row = service.table("reports").insert(report_payload).execute().data[0]
    return _normalize_session(session_row, report_row)


def cleanup_probe_rows():
    service = get_service_client()
    try:
        service.table("reports").delete().is_("session_id", "null").execute()
    except APIError:
        pass
    try:
        service.table("practice_sessions").delete().is_("user_id", "null").execute()
    except APIError:
        pass


def messages_table_available():
    global _MESSAGES_TABLE_AVAILABLE
    if _MESSAGES_TABLE_AVAILABLE is not None:
        return _MESSAGES_TABLE_AVAILABLE

    service = get_service_client()
    try:
        service.table("messages").select("*").limit(1).execute()
        _MESSAGES_TABLE_AVAILABLE = True
    except Exception:
        _MESSAGES_TABLE_AVAILABLE = False
    return _MESSAGES_TABLE_AVAILABLE


def store_message(session_id, user_id, role, content, created_at):
    if not messages_table_available():
        return

    payload = {
        "session_id": session_id,
        "user_id": user_id,
        "role": role,
        "content": content,
        "created_at": created_at,
    }

    try:
        get_service_client().table("messages").insert(payload).execute()
    except Exception:
        pass

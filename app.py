from functools import wraps

from flask import Flask, jsonify, redirect, render_template, request, session, url_for

from chatbot.chat import finish_session, get_or_start_session, process_user_message
from config import FLASK_SECRET_KEY
from database.queries import (
    authenticate_user,
    create_user_account,
    get_dashboard_data,
    get_report_data,
    get_user_profile,
    list_user_sessions,
)

app = Flask(__name__)
app.secret_key = FLASK_SECRET_KEY
app.config["JSON_SORT_KEYS"] = False
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"


def _current_profile():
    profile = session.get("profile")
    if profile:
        return profile

    user_id = session.get("user_id")
    if not user_id:
        return None

    profile = get_user_profile(user_id)
    if profile:
        session["profile"] = profile
    return profile


def _bootstrap_context():
    return {"bootstrap": {"currentUser": _current_profile()}}


def _set_auth_session(auth_payload):
    session.clear()
    session["user_id"] = auth_payload["user_id"]
    session["email"] = auth_payload["email"]
    session["access_token"] = auth_payload.get("access_token")
    session["refresh_token"] = auth_payload.get("refresh_token")
    session["profile"] = auth_payload["profile"]


def _json_error(message, status_code=400):
    return jsonify({"error": message}), status_code


def _request_data():
    return request.get_json(silent=True) or request.form or {}


def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not session.get("user_id"):
            if request.path.startswith("/api/"):
                return _json_error("Please log in to continue.", 401)
            return redirect(url_for("login"))
        return view(*args, **kwargs)

    return wrapped


@app.route("/")
@app.route("/login")
def login():
    if session.get("user_id"):
        return redirect(url_for("dashboard"))
    return render_template("login.html", **_bootstrap_context())


@app.route("/signup")
def signup():
    if session.get("user_id"):
        return redirect(url_for("dashboard"))
    return render_template("signup.html", **_bootstrap_context())


@app.route("/signup", methods=["POST"])
def signup_post():
    data = _request_data()
    full_name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", "")).strip()

    if len(full_name) < 2:
        return _json_error("Enter your full name.")
    if "@" not in email:
        return _json_error("Enter a valid email address.")
    if len(password) < 8:
        return _json_error("Password must be at least 8 characters.")

    try:
        auth_payload = create_user_account(email, password, full_name)
    except ValueError as error:
        return _json_error(str(error), 400)
    except Exception:
        return _json_error("Signup failed. Please try again.", 500)

    _set_auth_session(auth_payload)
    return jsonify({"ok": True, "redirect": url_for("dashboard")})


@app.route("/login", methods=["POST"])
def login_post():
    data = _request_data()
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", "")).strip()

    if "@" not in email:
        return _json_error("Enter a valid email address.")
    if len(password) < 8:
        return _json_error("Password must be at least 8 characters.")

    try:
        auth_payload = authenticate_user(email, password)
    except ValueError as error:
        return _json_error(str(error), 401)
    except Exception:
        return _json_error("Login failed. Please try again.", 500)

    _set_auth_session(auth_payload)
    return jsonify({"ok": True, "redirect": url_for("dashboard")})


@app.route("/logout")
def logout_get():
    session.clear()
    return redirect(url_for("login"))


@app.route("/logout", methods=["POST"])
def logout_post():
    session.clear()
    return jsonify({"ok": True, "redirect": url_for("login")})


@app.route("/dashboard")
@login_required
def dashboard():
    return render_template("dashboard.html", **_bootstrap_context())


@app.route("/practice")
@login_required
def practice():
    return render_template("practice.html", **_bootstrap_context())


@app.route("/report")
@login_required
def report():
    return render_template("report.html", **_bootstrap_context())


@app.route("/history")
@login_required
def history():
    return render_template("history.html", **_bootstrap_context())


@app.route("/api/dashboard")
@login_required
def api_dashboard():
    try:
        profile = _current_profile()
        dashboard_data = get_dashboard_data(session["user_id"])
        return jsonify({"user": profile, **dashboard_data})
    except Exception:
        app.logger.exception("Failed to load dashboard data")
        return _json_error("The dashboard could not be loaded right now.", 500)


@app.route("/api/history")
@login_required
def api_history():
    try:
        return jsonify({"sessions": list_user_sessions(session["user_id"])})
    except Exception:
        app.logger.exception("Failed to load history data")
        return _json_error("The session history could not be loaded right now.", 500)


@app.route("/api/report")
@login_required
def api_report():
    try:
        report_data = get_report_data(session["user_id"], request.args.get("session_id"))
        if not report_data:
            return _json_error("No report is available yet.", 404)
        return jsonify(report_data)
    except Exception:
        app.logger.exception("Failed to load report data")
        return _json_error("The report could not be loaded right now.", 500)


@app.route("/api/practice/session")
@login_required
def api_practice_session():
    try:
        restart = str(request.args.get("restart", "")).lower() in {"1", "true", "yes"}
        practice_session = get_or_start_session(
            session["user_id"],
            request.args.get("mode"),
            restart=restart,
            scenario_text=request.args.get("scenario"),
        )
        return jsonify({"session": practice_session})
    except Exception:
        app.logger.exception("Failed to load practice session")
        return _json_error("The practice session could not be loaded right now.", 500)


@app.route("/api/practice/message", methods=["POST"])
@login_required
def api_practice_message():
    data = _request_data()
    try:
        result = process_user_message(session["user_id"], data.get("message", ""))
    except ValueError as error:
        return _json_error(str(error), 400)
    except Exception:
        app.logger.exception("Failed to process practice message")
        return _json_error("Vani could not respond right now. Please try again.", 500)
    return jsonify(result)


@app.route("/api/practice/finish", methods=["POST"])
@login_required
def api_practice_finish():
    try:
        saved_session = finish_session(session["user_id"])
    except ValueError as error:
        return _json_error(str(error), 400)
    except Exception:
        app.logger.exception("Failed to finish practice session")
        return _json_error("The session could not be finished right now. Please try again.", 500)
    return jsonify({"ok": True, "sessionId": saved_session["id"], "session": saved_session})


import os

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000)),
        debug=False,
    )

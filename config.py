import os
import tempfile
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()


def _required_env(name):
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def normalize_supabase_project_url(url):
    normalized = url.strip().rstrip("/")
    if normalized.endswith("/rest/v1"):
        normalized = normalized[: -len("/rest/v1")]
    return normalized


SUPABASE_URL = _required_env("SUPABASE_URL")
SUPABASE_KEY = _required_env("SUPABASE_KEY")

# Supabase Service Role Key
SUPABASE_SERVICE_KEY = _required_env("SECRET_KEY")

# Flask Session Secret
FLASK_SECRET_KEY = _required_env("FLASK_SECRET_KEY")

# Groq API Key
GROQ_API_KEY = _required_env("GROQ_API_KEY")

SUPABASE_PROJECT_URL = normalize_supabase_project_url(SUPABASE_URL)

BASE_DIR = Path(__file__).resolve().parent
RAG_DOCS_DIR = BASE_DIR / "rag" / "docs"
CHROMA_PERSIST_DIR = Path(tempfile.gettempdir()) / "vani_chromadb"
CHROMA_COLLECTION_NAME = "vani_communication_docs"

GROQ_CHAT_MODEL = "llama-3.3-70b-versatile"
GROQ_EVALUATION_MODEL = "llama-3.3-70b-versatile"
GROQ_TEMPERATURE = 0.4
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
RAG_TOP_K = 3

DEFAULT_COMMUNICATION_GOAL = "Executive presence"
DEFAULT_EXPERIENCE_LEVEL = "Building confident, outcome-first answers"
DEFAULT_PROFILE_IMAGE = ""

PRACTICE_MODES = [
    {
        "id": "leadership-standup",
        "title": "Leadership Standup",
        "tag": "Executive presence",
        "difficulty": "Advanced",
        "duration": "12 min",
        "icon": "fa-solid fa-people-group",
        "scenario": "Deliver a concise leadership update that sounds calm, decisive, and outcome-first.",
        "description": "Practice high-visibility updates that keep the room aligned without sounding overly detailed.",
        "objective": "Lead with the business outcome, support it with one decision, and close with certainty.",
        "coachTip": "Lead with the business outcome, then the decision, then the next step.",
        "questions": [
            "Give a short leadership update on a project you own and start with why it matters.",
            "Describe a blocker or tradeoff you handled while keeping stakeholders aligned.",
            "Explain one decision you made and how you communicated it with confidence.",
            "Close with the single next step you want the room to remember.",
        ],
    },
    {
        "id": "interview-sprint",
        "title": "Interview Sprint",
        "tag": "Structured answers",
        "difficulty": "Intermediate",
        "duration": "10 min",
        "icon": "fa-solid fa-briefcase",
        "scenario": "Answer hiring-panel questions with structure, confidence, and clean delivery.",
        "description": "Sharpen short, high-pressure answers that stay clear and persuasive.",
        "objective": "Answer directly, support with one clear example, and land the impact quickly.",
        "coachTip": "Start with the situation, state your action, then land the impact quickly.",
        "questions": [
            "Tell me about yourself in a way that sounds relevant and memorable.",
            "Describe a time you handled conflicting priorities without losing momentum.",
            "How do you communicate difficult tradeoffs to leadership or teammates?",
            "End with the communication habit that makes you especially effective.",
        ],
    },
    {
        "id": "client-pitch",
        "title": "Client Pitch",
        "tag": "Persuasive clarity",
        "difficulty": "Advanced",
        "duration": "14 min",
        "icon": "fa-solid fa-handshake-angle",
        "scenario": "Pitch a solution to a client who needs confidence, clarity, and a crisp next step.",
        "description": "Practice sounding commercially sharp without losing warmth or trust.",
        "objective": "Frame the problem in the client's language, connect to outcomes, and ask for the next step clearly.",
        "coachTip": "Name the customer pain, translate it into outcomes, then invite the next step.",
        "questions": [
            "Open by framing the client's problem in their language.",
            "Explain why your solution is a fit without sounding generic.",
            "Handle a concern about cost, complexity, or implementation risk.",
            "Close with a helpful but confident next step.",
        ],
    },
    {
        "id": "difficult-conversation",
        "title": "Difficult Conversation",
        "tag": "Calm candor",
        "difficulty": "Advanced",
        "duration": "11 min",
        "icon": "fa-solid fa-shield-heart",
        "scenario": "Balance empathy and directness in a sensitive conversation where trust matters.",
        "description": "Practice naming the issue clearly while still sounding respectful and constructive.",
        "objective": "Acknowledge the relationship, name the issue clearly, and align on one next action.",
        "coachTip": "Acknowledge the relationship, name the issue clearly, then move to one next action.",
        "questions": [
            "Start the conversation in a way that feels respectful and steady.",
            "How would you name the issue without sounding vague or harsh?",
            "How do you keep the other person engaged instead of defensive?",
            "End with one clear next step you can both agree on.",
        ],
    },
    {
        "id": "friendly-chat",
        "title": "Friendly Chat",
        "tag": "Warm connection",
        "difficulty": "Open-ended",
        "duration": "Flexible",
        "icon": "fa-solid fa-comments",
        "scenario": "Have a natural back-and-forth conversation that helps you sound warm, clear, and confident in everyday communication.",
        "description": "Practice relaxed conversation that builds fluency, listening, and social confidence without a fixed question limit.",
        "objective": "Keep the conversation natural, respond with warmth, and ask or answer follow-ups with clear, easy flow.",
        "coachTip": "Stay present, answer directly, add one detail, and keep the exchange moving naturally.",
        "openingLine": "Let's start a friendly chat. Tell me something small about your day, your interests, or what's on your mind, and I'll help you sound warm, clear, and natural as we go.",
        "stopPhrase": "ok stop the chat",
        "stopPhrases": [
            "ok stop the chat",
            "okay stop the chat",
            "stop the chat",
            "wrap up the chat",
            "wrap up this chat",
        ],
        "isOpenEnded": True,
        "questions": [
            "Tell me something simple about your day or week and keep it natural.",
            "Share a hobby, habit, or interest in a way that sounds easy and engaging.",
            "Talk about a recent experience and add one detail that makes it memorable.",
            "Ask a friendly follow-up or keep the conversation moving with curiosity.",
        ],
    },
]

PRACTICE_MODE_MAP = {mode["id"]: mode for mode in PRACTICE_MODES}
DEFAULT_MODE_ID = PRACTICE_MODES[0]["id"]

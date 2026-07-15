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

CUSTOM_SCENARIO_ID = "custom-scenario"

PRACTICE_MODES = [
    {
        "id": "hr-interview",
        "title": "HR Interview",
        "tag": "Hiring conversation",
        "difficulty": "Intermediate",
        "duration": "12 min",
        "icon": "fa-solid fa-briefcase",
        "scenario": "You are preparing for a calm, structured HR interview where the interviewer is checking confidence, clarity, and fit.",
        "description": "Practice introducing yourself, answering behavioral questions, and sounding polished under pressure.",
        "objective": "Answer directly, add one concrete example, and finish each response with a confident close.",
        "coachTip": "Lead with the answer, support it with one example, and end with a clear takeaway.",
        "assistantRole": "HR interviewer",
        "userRole": "candidate",
        "openingLine": "Hi, I’m glad you could make it. Let’s begin with a simple one: tell me about yourself and why this role interests you.",
        "challengeStyle": "Ask follow-up questions that probe clarity, consistency, and confidence.",
        "evaluationFocus": "interview readiness",
    },
    {
        "id": "technical-interview",
        "title": "Technical Interview",
        "tag": "Problem solving",
        "difficulty": "Advanced",
        "duration": "14 min",
        "icon": "fa-solid fa-code",
        "scenario": "You are in a technical interview where the interviewer is testing depth, reasoning, and how clearly you explain complex ideas.",
        "description": "Practice explaining technical choices in plain language without sounding vague or defensive.",
        "objective": "Show your thinking, make tradeoffs explicit, and communicate a solution with confidence.",
        "coachTip": "Explain the reasoning, name the tradeoff, then state the decision clearly.",
        "assistantRole": "technical interviewer",
        "userRole": "candidate",
        "openingLine": "Let’s start with a classic interview prompt. Walk me through a technical project you’re proud of and the choices you made.",
        "challengeStyle": "Ask for reasoning, tradeoffs, and implementation details when the answer is vague.",
        "evaluationFocus": "technical explanation",
    },
    {
        "id": "manager-discussion",
        "title": "Manager Discussion",
        "tag": "Stakeholder alignment",
        "difficulty": "Intermediate",
        "duration": "11 min",
        "icon": "fa-solid fa-user-tie",
        "scenario": "You are speaking with your manager about priorities, performance, and how to handle a real workplace situation.",
        "description": "Practice sounding organized, honest, and decisive when the stakes are practical and direct.",
        "objective": "State the issue clearly, explain the impact, and agree on one next step.",
        "coachTip": "Be direct, add one concrete example, and close with a clear ask.",
        "assistantRole": "manager",
        "userRole": "team member",
        "openingLine": "Thanks for making time. What do you need from me today, and what outcome are you hoping for?",
        "challengeStyle": "Ask for impact, ownership, and a concrete next action.",
        "evaluationFocus": "manager communication",
    },
    {
        "id": "client-meeting",
        "title": "Client Meeting",
        "tag": "Customer trust",
        "difficulty": "Advanced",
        "duration": "13 min",
        "icon": "fa-solid fa-handshake-angle",
        "scenario": "You are in a client meeting where the other side wants progress, reassurance, and a clear next step.",
        "description": "Practice sounding commercially sharp while still warm, responsive, and trustworthy.",
        "objective": "Frame the issue in the client's language, answer concerns clearly, and move the conversation forward.",
        "coachTip": "Name the client pain, translate it into outcomes, then invite the next step.",
        "assistantRole": "client",
        "userRole": "account lead",
        "openingLine": "Good to see you. We need a clear update today, so please walk me through what changed and what it means for us.",
        "challengeStyle": "Stay a little skeptical, ask for specifics, and challenge weak business language.",
        "evaluationFocus": "client communication",
    },
    {
        "id": "leadership-standup",
        "title": "Leadership Standup",
        "tag": "Executive presence",
        "difficulty": "Advanced",
        "duration": "12 min",
        "icon": "fa-solid fa-people-group",
        "scenario": "You are presenting a concise leadership update that sounds calm, decisive, and outcome-first.",
        "description": "Practice high-visibility updates that keep the room aligned without sounding overly detailed.",
        "objective": "Lead with the business outcome, support it with one decision, and close with certainty.",
        "coachTip": "Lead with the business outcome, then the decision, then the next step.",
        "assistantRole": "senior manager",
        "userRole": "project owner",
        "openingLine": "Let’s hear the update. Start with the outcome first, then tell me what changed and what you need from the room.",
        "challengeStyle": "Push for brevity, clarity, and executive-style framing.",
        "evaluationFocus": "leadership communication",
    },
    {
        "id": "team-meeting",
        "title": "Team Meeting",
        "tag": "Collaborative clarity",
        "difficulty": "Intermediate",
        "duration": "10 min",
        "icon": "fa-solid fa-people-arrows",
        "scenario": "You are in a team meeting where you need to contribute clearly, listen well, and keep the group moving.",
        "description": "Practice sounding collaborative without rambling or hiding the point.",
        "objective": "Share your update, ask a useful follow-up, and keep the discussion organized.",
        "coachTip": "Be concise, reference the team's goal, and add one helpful next step.",
        "assistantRole": "teammate",
        "userRole": "team member",
        "openingLine": "Before we dive in, give me your update and mention anything the team should know right away.",
        "challengeStyle": "Keep it practical, collaborative, and slightly fast-moving.",
        "evaluationFocus": "team communication",
    },
    {
        "id": "difficult-conversation",
        "title": "Difficult Conversation",
        "tag": "Calm candor",
        "difficulty": "Advanced",
        "duration": "11 min",
        "icon": "fa-solid fa-shield-heart",
        "scenario": "You are balancing empathy and directness in a sensitive conversation where trust matters.",
        "description": "Practice naming the issue clearly while still sounding respectful and constructive.",
        "objective": "Acknowledge the relationship, name the issue clearly, and align on one next action.",
        "coachTip": "Acknowledge the relationship, name the issue clearly, then move to one next action.",
        "assistantRole": "the other person",
        "userRole": "conversation lead",
        "openingLine": "This sounds important. Tell me what happened, and I’ll respond like the other person in the conversation.",
        "challengeStyle": "Stay emotionally realistic, slightly guarded, and responsive to the user's tone.",
        "evaluationFocus": "difficult conversations",
    },
    {
        "id": "networking",
        "title": "Networking",
        "tag": "Relationship building",
        "difficulty": "Intermediate",
        "duration": "9 min",
        "icon": "fa-solid fa-user-group",
        "scenario": "You are meeting someone new at a networking event and want to sound natural, curious, and memorable.",
        "description": "Practice opening a conversation, asking better follow-ups, and leaving a strong impression.",
        "objective": "Sound warm, ask useful questions, and keep the exchange easy to follow.",
        "coachTip": "Open naturally, show real curiosity, and end with a clear next step.",
        "assistantRole": "new contact",
        "userRole": "networking guest",
        "openingLine": "Nice to meet you. What brought you here today, and what are you hoping to get out of this conversation?",
        "challengeStyle": "Keep it friendly, curious, and lightly professional.",
        "evaluationFocus": "networking",
    },
    {
        "id": "presentation-practice",
        "title": "Presentation Practice",
        "tag": "Public speaking",
        "difficulty": "Advanced",
        "duration": "15 min",
        "icon": "fa-solid fa-chalkboard-user",
        "scenario": "You are giving a presentation to an audience that wants clarity, confidence, and a clean structure.",
        "description": "Practice sounding clear, calm, and persuasive in front of a room.",
        "objective": "Open with the point, build it logically, and finish with a memorable close.",
        "coachTip": "Tell the audience what matters first, then support it with one clean proof point.",
        "assistantRole": "audience member",
        "userRole": "presenter",
        "openingLine": "Whenever you’re ready, give me the opening of your presentation and I’ll respond like a real audience member.",
        "challengeStyle": "Ask for structure, clarity, and strong transitions between ideas.",
        "evaluationFocus": "presentation",
    },
    {
        "id": "sales-pitch",
        "title": "Sales Pitch",
        "tag": "Persuasive clarity",
        "difficulty": "Advanced",
        "duration": "14 min",
        "icon": "fa-solid fa-bullhorn",
        "scenario": "You are pitching an idea or product to a skeptical buyer who wants relevance, value, and a clear next step.",
        "description": "Practice sounding persuasive without sounding pushy or generic.",
        "objective": "Frame the problem, prove the value, and ask for the next step confidently.",
        "coachTip": "Name the pain, show the payoff, then invite the decision.",
        "assistantRole": "skeptical buyer",
        "userRole": "seller",
        "openingLine": "I’m listening. Start with the problem you’re solving and why I should care.",
        "challengeStyle": "Push on value, timing, and objections without sounding hostile.",
        "evaluationFocus": "persuasion",
    },
    {
        "id": "friendly-conversation",
        "title": "Friendly Conversation",
        "tag": "Warm connection",
        "difficulty": "Open-ended",
        "duration": "Flexible",
        "icon": "fa-solid fa-comments",
        "scenario": "You are having a natural back-and-forth conversation that helps you sound warm, clear, and confident in everyday communication.",
        "description": "Practice relaxed conversation that builds fluency, listening, and social confidence without a fixed question limit.",
        "objective": "Keep the conversation natural, respond with warmth, and ask or answer follow-ups with clear, easy flow.",
        "coachTip": "Stay present, answer directly, add one detail, and keep the exchange moving naturally.",
        "openingLine": "Let's start a friendly chat. Tell me something small about your day, your interests, or what's on your mind, and I'll help you sound warm, clear, and natural as we go.",
        "isOpenEnded": True,
        "assistantRole": "friendly conversation partner",
        "userRole": "friend",
        "challengeStyle": "Keep it low pressure, warm, and conversational.",
        "evaluationFocus": "everyday conversation",
    },
    {
        "id": CUSTOM_SCENARIO_ID,
        "title": "Create Your Own Scenario",
        "tag": "Adaptive roleplay",
        "difficulty": "Flexible",
        "duration": "Flexible",
        "icon": "fa-solid fa-wand-magic-sparkles",
        "scenario": "Describe or speak any real situation. The coach will infer the most likely role, keep the other side in character, and adapt the conversation dynamically.",
        "description": "Turn any work or life situation into an interactive voice roleplay without needing a preset question list.",
        "objective": "Describe the scenario clearly, then practice it as a natural roleplay with follow-up questions.",
        "coachTip": "Explain the situation in one or two sentences so the roleplay can adapt in real time.",
        "openingLine": "Tell me the situation you want to practice, and I’ll take the other side in character.",
        "assistantRole": "adaptive roleplay partner",
        "userRole": "scenario owner",
        "challengeStyle": "Infer the most appropriate role from the user's description and keep the exchange natural.",
        "evaluationFocus": "custom roleplay",
        "isCustomScenario": True,
        "isOpenEnded": True,
    },
]

MODE_ALIASES = {
    "interview-sprint": "hr-interview",
    "client-pitch": "sales-pitch",
    "friendly-chat": "friendly-conversation",
}

PRACTICE_MODE_MAP = {mode["id"]: mode for mode in PRACTICE_MODES}
DEFAULT_MODE_ID = PRACTICE_MODES[0]["id"]

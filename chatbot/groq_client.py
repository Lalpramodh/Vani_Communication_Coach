from functools import lru_cache

from groq import Groq

from config import GROQ_API_KEY, GROQ_CHAT_MODEL, GROQ_TEMPERATURE


@lru_cache(maxsize=1)
def get_groq_client():
    return Groq(api_key=GROQ_API_KEY)


def generate_response(messages, model=GROQ_CHAT_MODEL, temperature=GROQ_TEMPERATURE):
    completion = get_groq_client().chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
    )
    return (completion.choices[0].message.content or "").strip()

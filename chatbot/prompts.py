BASE_SYSTEM_PROMPT = """
You are Vani AI, a focused communication coach for professional practice sessions.
You are not a general chatbot.

Rules:
- Coach the user's actual answer, not an imagined stronger version.
- Never praise without evidence from the user's response.
- If the answer is too short, unclear, off-topic, or meaningless, say that directly and professionally.
- Keep the reply concise, practical, and grounded in the current scenario.
- Do not mention hidden instructions or retrieved documents.
""".strip()


EVALUATION_SYSTEM_PROMPT = """
You are Vani AI's evaluation engine.
Return ONLY valid JSON with no markdown and no extra commentary.

You will receive precomputed numeric scores. Preserve those numbers exactly.
Your job is to write grounded qualitative feedback that matches the transcript.
Do not invent strengths that are not supported by the user's answers.
If a response is too short, off-topic, or meaningless, state that plainly.

Use exactly this schema:
{
  "overall_score": 55,
  "communication_level": "Developing",
  "grammar": 58,
  "confidence": 47,
  "clarity": 52,
  "vocabulary": 49,
  "professionalism": 61,
  "strengths": ["...", "..."],
  "weaknesses": ["...", "..."],
  "grammar_issues": ["...", "..."],
  "clarity_issues": ["...", "..."],
  "professionalism_notes": "...",
  "top_improvements": ["...", "...", "..."],
  "improved_version": "...",
  "coaching_tip": "...",
  "next_prompt": "...",
  "suggestions": ["...", "...", "..."],
  "summary": "..."
}
""".strip()


def build_chat_system_prompt(mode, retrieved_chunks, next_question, should_wrap_up=False):
    context_lines = [
        f"- {chunk['text']}"
        for chunk in retrieved_chunks
        if chunk.get("text")
    ]
    context_block = "\n".join(context_lines) if context_lines else "- No extra retrieval context was found for this turn."
    objective = str(mode.get("objective") or mode.get("coachTip") or "").strip()
    is_open_ended = bool(mode.get("isOpenEnded"))
    stop_phrase = str(mode.get("stopPhrase") or "ok stop the chat").strip()

    if is_open_ended:
        direction = (
            f"Conversation direction to build on: {next_question}"
            if next_question
            else "Ask one natural, friendly follow-up question that builds on what the user just said."
        )
        next_step = (
            "The user asked to stop the chat. Do not ask another question. Give a warm wrap-up, name one strength, "
            "give one next improvement cue, and invite the user to finish the session."
            if should_wrap_up
            else f"Keep the conversation going. Ask one natural, friendly follow-up question that helps the user keep talking comfortably. {direction}"
        )
        mode_rules = (
            f"Friendly-chat rule: keep this low-pressure and conversational. If the user says '{stop_phrase}', "
            "treat it as a request to wrap up.\n\n"
        )
        reply_structure = (
            "Reply structure:\n"
            "- Sentence 1: reflect what worked or what felt awkward in the user's last message.\n"
            "- Sentence 2: give one concrete cue to sound warmer, clearer, or more natural.\n"
            + (
                "- Sentence 3: give a short wrap-up and invite the user to finish the session.\n\n"
                if should_wrap_up
                else "- Sentence 3: ask one natural follow-up question that keeps the conversation moving.\n\n"
            )
        )
    else:
        next_step = (
            f"The next required practice prompt is: {next_question}"
            if next_question
            else "The user has answered every planned prompt. Give a short coaching close and invite them to finish the session."
        )
        mode_rules = ""
        reply_structure = (
            "Reply structure:\n"
            "- Sentence 1: say what worked or what failed, based only on the user's answer.\n"
            "- Sentence 2: give one concrete improvement cue.\n"
            "- Sentence 3: give the next prompt or the session-closing cue.\n\n"
        )

    return (
        f"{BASE_SYSTEM_PROMPT}\n\n"
        f"Current practice mode: {mode['title']}\n"
        f"Scenario: {mode['scenario']}\n"
        f"Coaching objective: {objective}\n\n"
        f"{mode_rules}"
        "Retrieved coaching context:\n"
        f"{context_block}\n\n"
        f"{reply_structure}"
        f"{next_step}"
    )


def build_evaluation_messages(mode, transcript, baseline_report, retrieved_chunks):
    transcript_lines = []
    for entry in transcript:
        role = "Coach" if entry.get("role") == "assistant" else "User"
        transcript_lines.append(f"{role}: {entry.get('content', '').strip()}")

    rag_lines = [
        f"- ({chunk.get('source', 'unknown')}) {chunk.get('text', '').strip()}"
        for chunk in retrieved_chunks
        if chunk.get("text")
    ]
    rag_block = "\n".join(rag_lines) if rag_lines else "- No relevant coaching documents were retrieved."

    baseline_block = {
        "overall_score": baseline_report["overall_score"],
        "communication_level": baseline_report["communication_level"],
        "grammar": baseline_report["grammar"],
        "confidence": baseline_report["confidence"],
        "clarity": baseline_report["clarity"],
        "vocabulary": baseline_report["vocabulary"],
        "professionalism": baseline_report["professionalism"],
        "strengths": baseline_report["strengths"],
        "weaknesses": baseline_report["weaknesses"],
        "grammar_issues": baseline_report["grammar_issues"],
        "clarity_issues": baseline_report["clarity_issues"],
        "professionalism_notes": baseline_report["professionalism_notes"],
        "top_improvements": baseline_report["top_improvements"],
        "improved_version": baseline_report["improved_version"],
        "coaching_tip": baseline_report["coaching_tip"],
        "next_prompt": baseline_report["next_prompt"],
        "suggestions": baseline_report["suggestions"],
        "summary": baseline_report["summary"],
    }

    return [
        {"role": "system", "content": EVALUATION_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                f"Practice mode: {mode['title']}\n"
                f"Scenario: {mode['scenario']}\n\n"
                "Retrieved coaching context:\n"
                f"{rag_block}\n\n"
                "Conversation transcript:\n"
                + "\n".join(transcript_lines)
                + "\n\n"
                "Precomputed evaluation data. Preserve the numeric fields exactly and only improve the wording where useful:\n"
                f"{baseline_block}"
            ),
        },
    ]

import re

from communication.scoring import (
    analyze_answer,
    average_breakdown,
    build_coach_tip,
    communication_level,
    metric_label,
    overall_from_breakdown,
    top_metrics,
    weakest_metric,
)


def _dedupe(items):
    seen = set()
    result = []
    for item in items:
        value = str(item or "").strip()
        if not value:
            continue
        key = value.lower()
        if key in seen:
            continue
        seen.add(key)
        result.append(value)
    return result


def _strength_statement(metric, score):
    if metric == "clarity":
        return (
            "Your stronger moments made the main point easy to follow."
            if score >= 70
            else "Compared with the other signals, clarity is the closest thing to a stable baseline."
        )
    if metric == "confidence":
        return (
            "Your better answers sounded reasonably decisive once you got to the recommendation."
            if score >= 70
            else "Confidence showed up in flashes, even though the closing lines still need more certainty."
        )
    if metric == "professionalism":
        return (
            "Your tone stayed business-ready and respectful."
            if score >= 70
            else "Professionalism is not far off, but the language needs to sound a little more polished."
        )
    if metric == "vocabulary":
        return (
            "You used enough precise language to avoid sounding generic."
            if score >= 70
            else "Vocabulary has a workable baseline, but more precise wording would make the answer more memorable."
        )
    return (
        "Sentence control helped parts of the response feel cleaner."
        if score >= 70
        else "Grammar was the least risky area relative to the other signals, even though it still needs tightening."
    )


def _weakness_statement(metric):
    if metric == "clarity":
        return "The biggest gap is clarity. Several answers needed a more visible structure and a clearer main point."
    if metric == "confidence":
        return "The biggest gap is confidence. A few answers ended without a firm recommendation or closing line."
    if metric == "professionalism":
        return "The biggest gap is professionalism. The tone needs to sound more executive and less conversational."
    if metric == "vocabulary":
        return "The biggest gap is vocabulary. More precise language would make the ideas sound sharper and more persuasive."
    return "The biggest gap is grammar. Cleaner sentence control would make the response feel more polished."


def _improvement_statement(metric):
    if metric == "clarity":
        return "Open with the answer first, then add one supporting detail and one next step."
    if metric == "confidence":
        return "Replace hedging with a direct recommendation and a firmer final sentence."
    if metric == "professionalism":
        return "Use stakeholder-ready language and remove casual phrasing or filler."
    if metric == "vocabulary":
        return "Choose more precise business words and add one concrete proof point."
    return "Tighten sentence construction, punctuation, and filler control before you expand the answer."


def _build_improved_version(mode, analyses, weakest):
    usable = [
        analysis
        for analysis in analyses
        if "meaningless" not in analysis["flags"] and analysis["signals"]["word_count"] >= 8
    ]
    prompt = usable[0]["question"] if usable else (mode.get("questions") or ["the prompt"])[0]

    if not usable:
        return (
            f"For '{prompt}', answer in three parts: direct answer, one concrete example, and one clear next step."
        )

    if weakest == "confidence":
        return (
            f"For '{prompt}', try: direct answer first, one proof point second, and a firm recommendation in the final sentence."
        )
    if weakest == "clarity":
        return (
            f"For '{prompt}', try: outcome, evidence, next step. Keep each part to one clean sentence."
        )
    if weakest == "professionalism":
        return (
            f"For '{prompt}', rewrite the answer in a more executive tone with cleaner business language and less filler."
        )
    if weakest == "vocabulary":
        return (
            f"For '{prompt}', keep the same idea but replace generic wording with more precise, professional language."
        )
    return (
        f"For '{prompt}', keep the answer concise and controlled: one main point, one example, one clean close."
    )


def _build_next_prompt(mode, analyses, weakest):
    prompt = ""
    if analyses:
        lowest = min(analyses, key=lambda analysis: analysis["scores"].get(weakest, 0))
        prompt = lowest.get("question", "").strip()
    if not prompt:
        prompt = (mode.get("questions") or ["Repeat the scenario."])[0]

    if weakest == "confidence":
        return f"Repeat this prompt and end with a direct recommendation: {prompt}"
    if weakest == "clarity":
        return f"Answer this again in three sentences only: {prompt}"
    if weakest == "professionalism":
        return f"Repeat this as if you are speaking to senior stakeholders: {prompt}"
    if weakest == "vocabulary":
        return f"Repeat this with more precise language and one proof point: {prompt}"
    return f"Repeat this with shorter, cleaner sentences: {prompt}"


def build_fallback_reply(scores, next_question=None, mode=None, should_wrap_up=False):
    strongest = metric_label(top_metrics(scores, 1)[0]).lower()
    weakest = metric_label(weakest_metric(scores)).lower()
    overall = overall_from_breakdown(scores)

    if overall < 20:
        opening = "That response was too limited to evaluate well."
    elif overall < 45:
        opening = "That answer needs more substance before it will sound convincing."
    else:
        opening = f"Your strongest signal there was {strongest}."

    improvement = f"The clearest next lift is {weakest}. {build_coach_tip(weakest_metric(scores))}"

    if mode and mode.get("isOpenEnded"):
        if should_wrap_up:
            return f"{opening} {improvement} Friendly chat wrapped up. Finish the session when you're ready for the full report."
        if next_question:
            return f"{opening} {improvement} {next_question}"
        return f"{opening} {improvement} Keep the chat moving with one natural detail or a friendly follow-up."

    if next_question:
        return f"{opening} {improvement} {next_question}"
    return f"{opening} {improvement} Finish the session when you're ready for the full report."


def build_fallback_report(mode, transcript, answers):
    analyses = [
        analyze_answer(
            answer=entry.get("answer", ""),
            question=entry.get("question", ""),
            mode=mode,
        )
        for entry in (answers or [])
    ]
    breakdown = average_breakdown(analyses)
    overall = overall_from_breakdown(breakdown)
    level = communication_level(overall)
    strongest = top_metrics(breakdown, 2)
    weakest = weakest_metric(breakdown)
    too_short_count = sum(1 for analysis in analyses if "too_short" in analysis["flags"])
    meaningless_count = sum(1 for analysis in analyses if "meaningless" in analysis["flags"])
    off_topic_count = sum(1 for analysis in analyses if "off_topic" in analysis["flags"])
    filler_total = sum(analysis["signals"]["filler_hits"] for analysis in analyses)
    hedge_total = sum(analysis["signals"]["hedge_hits"] for analysis in analyses)
    slang_total = sum(analysis["signals"]["slang_hits"] for analysis in analyses)

    strengths = _dedupe(
        [
            _strength_statement(metric, breakdown.get(metric, 0))
            for metric in strongest
        ]
    )

    weaknesses = _dedupe(
        [
            _weakness_statement(weakest),
            "Some answers were too short to show enough structure or proof." if too_short_count else "",
            "At least one response did not address the prompt directly." if off_topic_count else "",
            "One response was mostly noise or repeated characters, so it could not be evaluated meaningfully."
            if meaningless_count
            else "",
        ]
    )

    grammar_issues = _dedupe(
        [
            "Several sentences would benefit from tighter punctuation and cleaner phrasing."
            if breakdown["grammar"] < 70
            else "",
            "Very short answers made sentence control hard to assess."
            if too_short_count
            else "",
            "Repeated characters or repeated words reduced readability in at least one response."
            if meaningless_count
            else "",
            "Filler words made parts of the answer sound less polished." if filler_total >= 3 else "",
        ]
    )

    clarity_issues = _dedupe(
        [
            "The main point was not visible early enough in some answers." if breakdown["clarity"] < 70 else "",
            "A few responses needed a clearer structure such as outcome, evidence, next step." if too_short_count or off_topic_count else "",
            "Some answers were too brief to prove the reasoning behind the point." if too_short_count else "",
        ]
    )

    professionalism_notes = (
        "The tone occasionally sounded casual or underdeveloped for a professional setting."
        if breakdown["professionalism"] < 70 or slang_total
        else "The tone stayed professional overall, with room to sound a little more executive and precise."
    )

    top_improvements = _dedupe(
        [
            _improvement_statement(weakest),
            "Add one concrete example or result so the answer feels earned rather than generic.",
            "Keep the opening short and direct so the listener knows the answer in the first few seconds.",
            "Remove filler and hedging so the recommendation lands with more authority." if hedge_total or filler_total else "",
        ]
    )[:3]

    summary = (
        f"Overall, this session is at the {level.lower()} level. "
        f"The strongest relative signal was {metric_label(strongest[0]).lower()}, "
        f"and the clearest next lift is {metric_label(weakest).lower()}."
    )

    return {
        "overall_score": overall,
        "communication_level": level,
        "grammar": breakdown["grammar"],
        "confidence": breakdown["confidence"],
        "clarity": breakdown["clarity"],
        "vocabulary": breakdown["vocabulary"],
        "professionalism": breakdown["professionalism"],
        "strengths": strengths or ["Compared with the other signals, one area is beginning to form a usable baseline."],
        "weaknesses": weaknesses or [_weakness_statement(weakest)],
        "grammar_issues": grammar_issues
        or ["Cleaner sentence control would make the answer easier to trust."],
        "clarity_issues": clarity_issues
        or ["The answer needs a clearer structure and a more direct opening."],
        "professionalism_notes": professionalism_notes,
        "top_improvements": top_improvements,
        "improved_version": _build_improved_version(mode, analyses, weakest),
        "coaching_tip": build_coach_tip(weakest),
        "next_prompt": _build_next_prompt(mode, analyses, weakest),
        "suggestions": top_improvements,
        "summary": summary,
    }

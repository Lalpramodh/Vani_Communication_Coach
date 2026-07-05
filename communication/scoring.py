import re

METRICS = ["grammar", "vocabulary", "confidence", "clarity", "professionalism"]

METRIC_LABELS = {
    "grammar": "Grammar",
    "vocabulary": "Vocabulary",
    "confidence": "Confidence",
    "clarity": "Clarity",
    "professionalism": "Professionalism",
}

STOPWORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "for",
    "from",
    "how",
    "i",
    "if",
    "in",
    "is",
    "it",
    "me",
    "my",
    "of",
    "on",
    "or",
    "our",
    "so",
    "that",
    "the",
    "their",
    "them",
    "there",
    "they",
    "this",
    "to",
    "was",
    "we",
    "what",
    "when",
    "with",
    "you",
    "your",
}

FILLER_WORDS = {
    "actually",
    "basically",
    "just",
    "kind",
    "kinda",
    "like",
    "literally",
    "maybe",
    "really",
    "simply",
    "sort",
    "stuff",
    "thing",
    "things",
    "um",
    "uh",
    "youknow",
}

HEDGE_TERMS = {
    "could",
    "guess",
    "hope",
    "if",
    "might",
    "perhaps",
    "possibly",
    "probably",
    "seems",
    "should",
    "somewhat",
    "think",
    "try",
    "would",
}

CONFIDENT_TERMS = {
    "aligned",
    "clear",
    "commit",
    "committed",
    "confident",
    "decide",
    "decisive",
    "deliver",
    "executed",
    "focus",
    "improved",
    "launched",
    "led",
    "next",
    "outcome",
    "prioritized",
    "recommend",
    "resolved",
    "result",
    "should",
    "will",
}

BUSINESS_TERMS = {
    "alignment",
    "client",
    "customer",
    "decision",
    "delivery",
    "impact",
    "initiative",
    "leadership",
    "metric",
    "milestone",
    "outcome",
    "owner",
    "priority",
    "project",
    "recommendation",
    "result",
    "risk",
    "roadmap",
    "stakeholder",
    "strategy",
    "team",
    "timeline",
    "tradeoff",
    "update",
}

STRUCTURE_TERMS = {
    "because",
    "first",
    "next",
    "outcome",
    "result",
    "so",
    "therefore",
    "then",
}

SLANG_TERMS = {
    "awesome",
    "bro",
    "cool",
    "gonna",
    "heck",
    "lol",
    "omg",
    "stuff",
    "super",
    "totally",
    "wanna",
    "yeah",
}

GREETING_ONLY = {"hello", "hey", "hi", "thanks", "thankyou"}

WORD_RE = re.compile(r"[A-Za-z]+(?:'[A-Za-z]+)?")
REPEATED_CHAR_RE = re.compile(r"(.)\1{4,}", re.IGNORECASE)
REPEATED_WORD_RE = re.compile(r"\b([a-z']+)(?:\W+\1\b){2,}", re.IGNORECASE)


def clamp(value, minimum=0, maximum=100):
    return max(minimum, min(maximum, int(round(value))))


def metric_label(metric):
    return METRIC_LABELS.get(metric, str(metric).replace("_", " ").title())


def communication_level(overall_score):
    score = clamp(overall_score)
    if score < 35:
        return "Needs Foundation"
    if score < 55:
        return "Emerging"
    if score < 70:
        return "Developing"
    if score < 85:
        return "Strong"
    if score < 93:
        return "Advanced"
    return "Executive Ready"


def build_coach_tip(metric):
    tips = {
        "grammar": "Shorten each sentence, remove filler, and let the main point land cleanly.",
        "vocabulary": "Use more precise business language and add one concrete proof point.",
        "confidence": "State the recommendation directly and close without hedging.",
        "clarity": "Use a visible structure: outcome, evidence, next step.",
        "professionalism": "Choose stakeholder-ready language and keep the tone measured.",
    }
    return tips.get(metric, tips["clarity"])


def _tokenize(text):
    return [match.group(0).lower() for match in WORD_RE.finditer(str(text or ""))]


def _split_sentences(text):
    cleaned = re.split(r"[.!?]+", str(text or ""))
    return [sentence.strip() for sentence in cleaned if sentence.strip()]


def _focus_terms(question, mode):
    parts = [str(question or "").strip()]
    if mode:
        parts.append(str(mode.get("title") or "").strip())
        parts.append(str(mode.get("scenario") or "").strip())

    terms = []
    for word in _tokenize(" ".join(parts)):
        if len(word) >= 4 and word not in STOPWORDS:
            terms.append(word)
    return set(terms)


def _count_terms(words, term_set):
    return sum(1 for word in words if word in term_set)


def _apply_caps(scores, flags):
    adjusted = dict(scores)

    if "meaningless" in flags:
        for metric in METRICS:
            adjusted[metric] = clamp(min(adjusted[metric], 12), 2, 12)
        return adjusted

    if "too_short" in flags and "off_topic" in flags:
        for metric in METRICS:
            adjusted[metric] = clamp(min(adjusted[metric], 20), 4, 20)
        return adjusted

    if "too_short" in flags:
        for metric in METRICS:
            adjusted[metric] = clamp(min(adjusted[metric], 42), 8, 42)

    if "off_topic" in flags:
        adjusted["clarity"] = clamp(min(adjusted["clarity"], 38))
        adjusted["confidence"] = clamp(min(adjusted["confidence"], 34))
        adjusted["professionalism"] = clamp(min(adjusted["professionalism"], 46))

    return adjusted


def overall_from_breakdown(breakdown):
    scores = breakdown or {}
    weighted_total = (
        scores.get("grammar", 0) * 0.18
        + scores.get("vocabulary", 0) * 0.18
        + scores.get("confidence", 0) * 0.22
        + scores.get("clarity", 0) * 0.24
        + scores.get("professionalism", 0) * 0.18
    )
    return clamp(weighted_total)


def weakest_metric(breakdown):
    scores = breakdown or {}
    return min(METRICS, key=lambda metric: scores.get(metric, 0))


def top_metrics(breakdown, count=2):
    scores = breakdown or {}
    return sorted(METRICS, key=lambda metric: scores.get(metric, 0), reverse=True)[: max(1, count)]


def average_breakdown(entries):
    normalized = []
    for entry in entries or []:
        if not entry:
            continue
        if isinstance(entry, dict) and "scores" in entry:
            normalized.append(entry["scores"])
            continue
        normalized.append(entry)

    if not normalized:
        return {metric: 0 for metric in METRICS}

    return {
        metric: clamp(
            sum(clamp(item.get(metric, 0)) for item in normalized) / max(1, len(normalized))
        )
        for metric in METRICS
    }


def analyze_answer(answer, question="", mode=None):
    text = str(answer or "").strip()
    words = _tokenize(text)
    sentences = _split_sentences(text)
    word_count = len(words)
    sentence_count = len(sentences)
    unique_count = len(set(words))
    unique_ratio = (unique_count / word_count) if word_count else 0
    avg_sentence_words = (word_count / sentence_count) if sentence_count else 0
    filler_hits = _count_terms(words, FILLER_WORDS)
    hedge_hits = _count_terms(words, HEDGE_TERMS)
    confident_hits = _count_terms(words, CONFIDENT_TERMS)
    business_hits = _count_terms(words, BUSINESS_TERMS)
    structure_hits = _count_terms(words, STRUCTURE_TERMS)
    slang_hits = _count_terms(words, SLANG_TERMS)
    long_word_hits = sum(1 for word in words if len(word) >= 7)
    repeated_chars = bool(REPEATED_CHAR_RE.search(text))
    repeated_words = bool(REPEATED_WORD_RE.search(text))
    has_terminal_punctuation = bool(text) and text[-1] in ".!?"
    starts_upper = bool(text[:1]) and text[:1].isupper()
    question_marks = text.count("?")
    exclamation_marks = text.count("!")
    focus_terms = _focus_terms(question, mode)
    overlap_terms = set(words) & focus_terms
    overlap_ratio = (len(overlap_terms) / len(focus_terms)) if focus_terms else 0
    greeting_only = word_count and set(words).issubset(GREETING_ONLY)

    flags = []
    if word_count == 0 or greeting_only or (repeated_chars and unique_count <= 2):
        flags.append("meaningless")
    if word_count < 6:
        flags.append("too_short")
    if focus_terms and overlap_ratio == 0 and word_count < 16:
        flags.append("off_topic")

    grammar_score = 54
    grammar_score += min(word_count * 1.3, 18)
    grammar_score += 6 if has_terminal_punctuation else -4
    grammar_score += 5 if starts_upper else -4
    grammar_score += 4 if sentence_count >= 1 else 0
    grammar_score += 4 if 1 <= avg_sentence_words <= 24 else -4
    grammar_score -= filler_hits * 2
    grammar_score -= 12 if repeated_chars else 0
    grammar_score -= 6 if repeated_words else 0
    grammar_score -= 5 if avg_sentence_words > 28 else 0

    vocabulary_score = 50
    vocabulary_score += unique_ratio * 24
    vocabulary_score += min(long_word_hits * 1.4, 12)
    vocabulary_score += min(business_hits * 2.6, 12)
    vocabulary_score -= filler_hits * 2
    vocabulary_score -= max(0, 8 - unique_count) * 1.5

    confidence_score = 50
    confidence_score += min(word_count, 30) * 0.7
    confidence_score += min(confident_hits * 4.5, 18)
    confidence_score -= min(hedge_hits * 5.5, 20)
    confidence_score -= filler_hits * 2
    confidence_score -= question_marks * 3

    clarity_score = 52
    clarity_score += min(word_count, 28) * 0.8
    clarity_score += min(structure_hits * 4, 16)
    clarity_score += 6 if 2 <= sentence_count <= 4 else 0
    clarity_score -= 8 if avg_sentence_words > 26 else 0
    clarity_score -= filler_hits * 2
    clarity_score -= 8 if unique_ratio < 0.45 and word_count > 10 else 0

    professionalism_score = 56
    professionalism_score += min(business_hits * 3, 16)
    professionalism_score += min(confident_hits * 1.8, 8)
    professionalism_score -= slang_hits * 12
    professionalism_score -= filler_hits * 2
    professionalism_score -= exclamation_marks * 3
    professionalism_score -= 8 if text.isupper() and text else 0

    raw_scores = {
        "grammar": clamp(grammar_score),
        "vocabulary": clamp(vocabulary_score),
        "confidence": clamp(confidence_score),
        "clarity": clamp(clarity_score),
        "professionalism": clamp(professionalism_score),
    }
    scores = _apply_caps(raw_scores, flags)
    overall = overall_from_breakdown(scores)

    return {
        "text": text,
        "question": str(question or "").strip(),
        "scores": scores,
        "overall": overall,
        "communication_level": communication_level(overall),
        "flags": flags,
        "signals": {
            "word_count": word_count,
            "sentence_count": sentence_count,
            "unique_ratio": round(unique_ratio, 3),
            "focus_overlap": len(overlap_terms),
            "filler_hits": filler_hits,
            "hedge_hits": hedge_hits,
            "business_hits": business_hits,
            "structure_hits": structure_hits,
            "slang_hits": slang_hits,
            "repeated_chars": repeated_chars,
            "repeated_words": repeated_words,
        },
    }


def score_answer(answer, question="", mode=None):
    return analyze_answer(answer, question=question, mode=mode)["scores"]

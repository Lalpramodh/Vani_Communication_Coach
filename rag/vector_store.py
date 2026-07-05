import threading

from config import RAG_TOP_K
from rag.loader import load_documents

_LOCK = threading.Lock()

_STATE = {
    "documents": None,
    "ready": False,
}


def _initialize():
    if _STATE["ready"]:
        return

    _STATE["documents"] = load_documents()
    _STATE["ready"] = True


def _keyword_search(query, documents, top_k):
    query = str(query).lower()

    words = [
        word.strip()
        for word in query.split()
        if len(word.strip()) > 2
    ]

    scored = []

    for document in documents:
        text = document["text"].lower()

        score = 0

        for word in words:
            score += text.count(word)

        scored.append((score, document))

    scored.sort(key=lambda x: x[0], reverse=True)

    if scored and scored[0][0] > 0:
        return [doc for _, doc in scored[:top_k]]

    return documents[:top_k]


def retrieve_relevant_chunks(query, top_k=RAG_TOP_K):

    with _LOCK:
        if not _STATE["ready"]:
            _initialize()

    documents = _STATE["documents"] or []

    if not documents:
        return []

    return _keyword_search(query, documents, top_k)
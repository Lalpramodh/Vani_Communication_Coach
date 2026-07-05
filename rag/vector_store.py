import threading

from config import CHROMA_COLLECTION_NAME, CHROMA_PERSIST_DIR, EMBEDDING_MODEL, RAG_TOP_K
from rag.loader import load_documents

_LOCK = threading.Lock()
_STATE = {
    "collection": None,
    "embedder": None,
    "documents": None,
    "ready": False,
    "fallback_only": False,
}


def _keyword_search(query, documents, top_k):
    terms = [term for term in str(query or "").lower().split() if term]
    scored = []
    for document in documents:
        haystack = document["text"].lower()
        score = sum(haystack.count(term) for term in terms)
        scored.append((score, document))
    scored.sort(key=lambda item: item[0], reverse=True)
    return [document for score, document in scored[:top_k] if score > 0] or documents[:top_k]


def _initialize():
    if _STATE["ready"]:
        return

    documents = load_documents()
    _STATE["documents"] = documents
    if not documents:
        _STATE["ready"] = True
        return

    import chromadb
    from sentence_transformers import SentenceTransformer

    CHROMA_PERSIST_DIR.mkdir(parents=True, exist_ok=True)
    client = chromadb.PersistentClient(path=str(CHROMA_PERSIST_DIR))
    collection = client.get_or_create_collection(name=CHROMA_COLLECTION_NAME)
    embedder = SentenceTransformer(EMBEDDING_MODEL)

    ids = [document["id"] for document in documents]
    texts = [document["text"] for document in documents]
    metadatas = [{"source": document["source"]} for document in documents]
    embeddings = embedder.encode(texts, normalize_embeddings=True).tolist()

    collection.upsert(ids=ids, documents=texts, metadatas=metadatas, embeddings=embeddings)

    _STATE["collection"] = collection
    _STATE["embedder"] = embedder
    _STATE["ready"] = True
    _STATE["fallback_only"] = False


def retrieve_relevant_chunks(query, top_k=RAG_TOP_K):
    with _LOCK:
        try:
            _initialize()
        except Exception:
            documents = _STATE["documents"] or load_documents()
            _STATE["documents"] = documents
            _STATE["collection"] = None
            _STATE["embedder"] = None
            _STATE["ready"] = True
            _STATE["fallback_only"] = True
            return _keyword_search(query, documents, top_k)

    documents = _STATE["documents"] or []
    if not documents:
        return []

    if _STATE["fallback_only"] or not _STATE["collection"] or not _STATE["embedder"]:
        return _keyword_search(query, documents, top_k)

    query_embedding = _STATE["embedder"].encode([query], normalize_embeddings=True).tolist()
    result = _STATE["collection"].query(query_embeddings=query_embedding, n_results=top_k)
    chunks = []
    for index, document_text in enumerate(result.get("documents", [[]])[0]):
        metadata = result.get("metadatas", [[]])[0][index] if result.get("metadatas") else {}
        chunks.append(
            {
                "source": metadata.get("source", ""),
                "text": document_text,
            }
        )
    return chunks

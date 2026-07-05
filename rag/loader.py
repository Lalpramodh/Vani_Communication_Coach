from pathlib import Path

from config import RAG_DOCS_DIR


def _chunk_text(text, chunk_size=600, overlap=120):
    if len(text) <= chunk_size:
        return [text]

    chunks = []
    start = 0
    while start < len(text):
        end = min(len(text), start + chunk_size)
        chunks.append(text[start:end].strip())
        if end >= len(text):
            break
        start = max(0, end - overlap)
    return [chunk for chunk in chunks if chunk]


def load_documents(documents_dir=RAG_DOCS_DIR):
    documents = []
    for path in sorted(Path(documents_dir).glob("*.txt")):
        text = path.read_text(encoding="utf-8").strip()
        if not text:
            continue
        for index, chunk in enumerate(_chunk_text(text)):
            documents.append(
                {
                    "id": f"{path.stem}-{index}",
                    "source": path.name,
                    "text": chunk,
                }
            )
    return documents

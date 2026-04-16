"""Scan data ingestion into ChromaDB vector store."""

import logging
from typing import Any

import chromadb

from backend.config import CHROMA_PERSIST_DIR
from backend.ai.rag.embedder import device_to_chunks, alert_to_chunk

logger = logging.getLogger(__name__)

_client: chromadb.ClientAPI | None = None
_collection: Any = None

COLLECTION_NAME = "shards_network"


def _get_collection() -> Any:
    """Get or create the ChromaDB collection."""
    global _client, _collection
    if _collection is None:
        _client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)
        _collection = _client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )
        logger.info("ChromaDB collection '%s' ready (%d documents)", COLLECTION_NAME, _collection.count())
    return _collection


def ingest_scan_data(
    devices: list[dict[str, Any]],
    alerts: list[dict[str, Any]] | None = None,
    scan_id: int | None = None,
) -> int:
    """Ingest device and alert data into ChromaDB. Returns count of documents upserted."""
    collection = _get_collection()

    ids: list[str] = []
    documents: list[str] = []
    metadatas: list[dict[str, Any]] = []

    for device in devices:
        for chunk in device_to_chunks(device, scan_id=scan_id):
            ids.append(chunk["id"])
            documents.append(chunk["text"])
            metadatas.append(chunk["metadata"])

    if alerts:
        for alert in alerts:
            chunk = alert_to_chunk(alert)
            ids.append(chunk["id"])
            documents.append(chunk["text"])
            metadatas.append(chunk["metadata"])

    if ids:
        # Upsert in batches of 100
        for i in range(0, len(ids), 100):
            batch_end = min(i + 100, len(ids))
            collection.upsert(
                ids=ids[i:batch_end],
                documents=documents[i:batch_end],
                metadatas=metadatas[i:batch_end],
            )

    total = len(ids)
    logger.info("Ingested %d chunks into ChromaDB (scan_id=%s)", total, scan_id)
    return total


def get_document_count() -> int:
    """Return number of documents in the collection."""
    return _get_collection().count()


def reset_collection() -> None:
    """Delete and recreate the collection."""
    global _collection
    if _client:
        _client.delete_collection(COLLECTION_NAME)
        _collection = None
        logger.info("ChromaDB collection reset")

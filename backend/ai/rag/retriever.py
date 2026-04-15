"""Vector DB query and context retrieval for RAG pipeline."""

import logging
from typing import Any

from backend.ai.rag.ingestion import _get_collection

logger = logging.getLogger(__name__)


def retrieve(
    query: str,
    top_k: int = 10,
    risk_tier: str | None = None,
    device_type: str | None = None,
) -> list[dict[str, Any]]:
    """Query ChromaDB for relevant chunks.

    Args:
        query: Natural language query string
        top_k: Number of results to return
        risk_tier: Optional filter (critical, high, medium, low)
        device_type: Optional filter (router, server, iot, etc.)

    Returns:
        List of {text, metadata, distance} dicts sorted by relevance
    """
    collection = _get_collection()

    if collection.count() == 0:
        logger.warning("ChromaDB collection is empty — no data to retrieve")
        return []

    where_filter: dict[str, Any] | None = None
    conditions: list[dict[str, Any]] = []

    if risk_tier:
        conditions.append({"risk_tier": {"$eq": risk_tier}})
    if device_type:
        conditions.append({"device_type": {"$eq": device_type}})

    if len(conditions) == 1:
        where_filter = conditions[0]
    elif len(conditions) > 1:
        where_filter = {"$and": conditions}

    try:
        results = collection.query(
            query_texts=[query],
            n_results=min(top_k, collection.count()),
            where=where_filter,
        )
    except Exception as e:
        logger.error("ChromaDB query failed: %s", e)
        return []

    chunks: list[dict[str, Any]] = []
    if results and results["documents"]:
        docs = results["documents"][0]
        metas = results["metadatas"][0] if results["metadatas"] else [{}] * len(docs)
        dists = results["distances"][0] if results["distances"] else [0.0] * len(docs)

        for doc, meta, dist in zip(docs, metas, dists):
            chunks.append({
                "text": doc,
                "metadata": meta,
                "distance": dist,
            })

    logger.info("Retrieved %d chunks for query: '%s'", len(chunks), query[:80])
    return chunks


def build_context(chunks: list[dict[str, Any]], max_chars: int = 6000) -> str:
    """Build a context string from retrieved chunks, respecting token budget."""
    context_parts: list[str] = []
    total_chars = 0

    for chunk in chunks:
        text = chunk["text"]
        if total_chars + len(text) > max_chars:
            break
        context_parts.append(text)
        total_chars += len(text)

    return "\n\n---\n\n".join(context_parts)

"""Claude API integration for network security analysis."""

import logging
from typing import Any

from backend.config import ANTHROPIC_API_KEY, LLM_MODEL, FRAGMENTS_MOCK
from backend.ai.rag.retriever import retrieve, build_context

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are Shards AI, a network security analyst assistant. You analyze network scan data and provide actionable security insights.

Your capabilities:
- Assess device risk based on open ports, services, OS versions, and CVEs
- Identify network threats and recommend mitigations
- Explain vulnerabilities in clear, non-technical language when needed
- Reference specific devices by IP, hostname, and MAC address
- Provide evidence-based answers grounded in actual scan data

Rules:
- ALWAYS cite specific devices (IP, hostname) when discussing risks
- NEVER fabricate data — if the scan data doesn't contain information, say so
- Prioritize actionable recommendations
- Be concise but thorough
- Format responses with markdown for readability"""


async def analyze_query(question: str) -> dict[str, Any]:
    """Run RAG pipeline: retrieve context → send to Claude → return response.

    Returns dict with 'response' and 'sources' fields.
    """
    # Step 1: Retrieve relevant context from ChromaDB
    chunks = retrieve(question, top_k=10)
    context = build_context(chunks)
    sources = _extract_sources(chunks)

    if not context:
        return {
            "response": "No scan data is available yet. Please run a network scan first, then try your question again.",
            "sources": [],
        }

    # Step 2: Build prompt with context
    user_message = f"""Based on the following network scan data, answer the analyst's question.

## Network Scan Data
{context}

## Analyst's Question
{question}

Provide a detailed, evidence-based response referencing specific devices and findings from the scan data."""

    # Step 3: Call LLM
    if FRAGMENTS_MOCK and not ANTHROPIC_API_KEY:
        return _mock_response(question, chunks, sources)

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        response = client.messages.create(
            model=LLM_MODEL,
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )
        return {
            "response": response.content[0].text,
            "sources": sources,
        }
    except Exception as e:
        logger.error("Claude API call failed: %s", e)
        # Fall back to mock in case of API failure
        return _mock_response(question, chunks, sources)


def _extract_sources(chunks: list[dict[str, Any]]) -> list[str]:
    """Extract unique source references from retrieved chunks."""
    sources: list[str] = []
    seen: set[str] = set()
    for chunk in chunks:
        meta = chunk.get("metadata", {})
        if meta.get("type") == "device":
            ref = f"{meta.get('ip', '?')} ({meta.get('mac', '?')})"
            if ref not in seen:
                sources.append(ref)
                seen.add(ref)
        elif meta.get("type") == "alert":
            ref = f"Alert: {meta.get('alert_type', '?')} on {meta.get('device_mac', '?')}"
            if ref not in seen:
                sources.append(ref)
                seen.add(ref)
    return sources[:5]


def _mock_response(
    question: str,
    chunks: list[dict[str, Any]],
    sources: list[str],
) -> dict[str, Any]:
    """Generate a structured mock response from retrieved chunks when no API key is available."""
    if not chunks:
        return {
            "response": "No relevant scan data found for your query. Try running a scan first.",
            "sources": [],
        }

    # Build a deterministic response from the retrieved data
    question_lower = question.lower()
    lines: list[str] = ["## Analysis\n"]

    # Gather device info from chunks
    devices_info: list[dict[str, Any]] = []
    for chunk in chunks:
        meta = chunk.get("metadata", {})
        if meta.get("type") == "device" and "port" not in meta:
            devices_info.append(meta)

    if "risk" in question_lower or "dangerous" in question_lower or "vulnerable" in question_lower:
        lines.append("Based on the current scan data, here are the highest-risk devices:\n")
        for d in sorted(devices_info, key=lambda x: x.get("risk_score", 0), reverse=True)[:5]:
            lines.append(f"- **{d.get('ip', '?')}** (MAC: {d.get('mac', '?')}) — "
                        f"Risk: {d.get('risk_score', 0)}/100 ({d.get('risk_tier', '?')}), "
                        f"Type: {d.get('device_type', '?')}")
    elif "device" in question_lower or "network" in question_lower:
        lines.append(f"The network scan found **{len(devices_info)} devices**:\n")
        for d in devices_info[:8]:
            lines.append(f"- **{d.get('ip', '?')}** — {d.get('device_type', '?')}, "
                        f"Risk: {d.get('risk_score', 0)}/100")
    else:
        lines.append("Here's what the scan data shows:\n")
        for chunk in chunks[:5]:
            lines.append(f"```\n{chunk['text'][:200]}\n```\n")

    lines.append("\n*Note: Running in mock mode. Connect an API key for full AI analysis.*")

    return {
        "response": "\n".join(lines),
        "sources": sources,
    }

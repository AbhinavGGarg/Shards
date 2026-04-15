"""Control-by-control compliance assessment engine."""

import logging
from typing import Any

from backend.config import ANTHROPIC_API_KEY, LLM_MODEL, FRAGMENTS_MOCK
from backend.ai.rag.retriever import retrieve, build_context

logger = logging.getLogger(__name__)


async def assess_control(control: dict[str, Any]) -> dict[str, Any]:
    """Assess a single control against current scan data.

    Returns control dict augmented with: verdict, reasoning, remediation.
    """
    # Use targeted queries based on control content for better retrieval
    desc_lower = (control.get("description", "") + " " + control.get("title", "")).lower()
    if any(kw in desc_lower for kw in ("telnet", "encrypt", "ssh", "insecure", "remote management")):
        query = "telnet ftp insecure protocols open ports"
    elif any(kw in desc_lower for kw in ("vulnerability", "patch", "cve")):
        query = "high risk critical vulnerability CVE devices"
    elif any(kw in desc_lower for kw in ("access control", "authorization", "untrusted")):
        query = "untrusted rogue device access"
    else:
        query = f"Network compliance: {control['title']}. {control['description']}"
    chunks = retrieve(query, top_k=5)
    context = build_context(chunks, max_chars=3000)

    if FRAGMENTS_MOCK and not ANTHROPIC_API_KEY:
        return _mock_assess(control, chunks)

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

        prompt = f"""You are a network compliance assessor. Assess the following control against the network scan evidence.

## Control
ID: {control['control_id']}
Title: {control['title']}
Description: {control['description']}
Category: {control['category']}

## Network Scan Evidence
{context if context else 'No relevant scan data available.'}

## Instructions
Provide:
1. **Verdict**: Exactly one of: Compliant, Partial, Non-Compliant
2. **Reasoning**: 2-3 sentences explaining the verdict based on evidence
3. **Remediation**: If not fully compliant, specific steps to remediate

Format your response as:
VERDICT: [verdict]
REASONING: [reasoning]
REMEDIATION: [remediation or "N/A"]"""

        response = client.messages.create(
            model=LLM_MODEL,
            max_tokens=512,
            messages=[{"role": "user", "content": prompt}],
        )
        return _parse_assessment(control, response.content[0].text)

    except Exception as e:
        logger.error("Compliance assessment failed for %s: %s", control['control_id'], e)
        return _mock_assess(control, chunks)


async def assess_framework(controls: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Assess all controls in a framework. Returns list of assessed controls."""
    results: list[dict[str, Any]] = []
    for control in controls:
        assessed = await assess_control(control)
        results.append(assessed)
    return results


def _mock_assess(control: dict[str, Any], chunks: list[dict[str, Any]]) -> dict[str, Any]:
    """Generate deterministic mock assessment based on control content and scan data."""
    title_lower = control.get("title", "").lower()
    desc_lower = control.get("description", "").lower()

    # Check scan data for relevant findings
    has_telnet = any("telnet" in c.get("text", "").lower() for c in chunks)
    has_ftp = any("ftp" in c.get("text", "").lower() for c in chunks)
    has_high_risk = any(c.get("metadata", {}).get("risk_score", 0) > 50 for c in chunks)
    has_untrusted = any("Trusted: No" in c.get("text", "") for c in chunks)

    # Heuristic verdicts
    if any(kw in title_lower + desc_lower for kw in ("encryption", "encrypt", "tls", "ssl")):
        if has_telnet or has_ftp:
            verdict = "Non-Compliant"
            reasoning = "Unencrypted protocols (telnet, FTP) detected on network devices."
            remediation = "Disable telnet and FTP services. Replace with SSH and SFTP."
        else:
            verdict = "Compliant"
            reasoning = "No unencrypted management protocols detected in scan data."
            remediation = "N/A"
    elif any(kw in title_lower + desc_lower for kw in ("access control", "authorization", "authentication")):
        if has_untrusted:
            verdict = "Partial"
            reasoning = "Untrusted devices detected on the network without access controls."
            remediation = "Implement network access control (NAC) and segment untrusted devices."
        else:
            verdict = "Compliant"
            reasoning = "All detected devices are in the trusted device list."
            remediation = "N/A"
    elif any(kw in title_lower + desc_lower for kw in ("vulnerability", "patch", "update")):
        if has_high_risk:
            verdict = "Non-Compliant"
            reasoning = "High-risk devices with known vulnerabilities detected."
            remediation = "Patch affected systems and remediate known CVEs."
        else:
            verdict = "Compliant"
            reasoning = "No critical vulnerabilities detected in current scan data."
            remediation = "N/A"
    elif any(kw in title_lower + desc_lower for kw in ("inventory", "asset")):
        verdict = "Compliant"
        reasoning = "Network scan provides comprehensive device inventory with identification."
        remediation = "N/A"
    elif any(kw in title_lower + desc_lower for kw in ("monitor", "logging", "audit")):
        verdict = "Partial"
        reasoning = "Real-time monitoring is active but logging retention policy not configured."
        remediation = "Configure log retention policy and ensure audit trails are preserved."
    else:
        verdict = "Partial" if has_high_risk else "Compliant"
        reasoning = "Assessment based on available scan data." + (" Risk factors detected." if has_high_risk else "")
        remediation = "Review scan findings and address any identified gaps." if has_high_risk else "N/A"

    return {
        **control,
        "verdict": verdict,
        "reasoning": reasoning,
        "remediation": remediation,
    }


def _parse_assessment(control: dict[str, Any], response_text: str) -> dict[str, Any]:
    """Parse Claude's structured assessment response."""
    verdict = "Partial"
    reasoning = ""
    remediation = "N/A"

    for line in response_text.split("\n"):
        line = line.strip()
        if line.upper().startswith("VERDICT:"):
            v = line.split(":", 1)[1].strip()
            if v in ("Compliant", "Partial", "Non-Compliant"):
                verdict = v
        elif line.upper().startswith("REASONING:"):
            reasoning = line.split(":", 1)[1].strip()
        elif line.upper().startswith("REMEDIATION:"):
            remediation = line.split(":", 1)[1].strip()

    return {
        **control,
        "verdict": verdict,
        "reasoning": reasoning,
        "remediation": remediation,
    }

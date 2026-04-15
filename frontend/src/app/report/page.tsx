"use client";

import { useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ReportPage() {
  const [generating, setGenerating] = useState(false);
  const [reportUrl, setReportUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    setReportUrl(null);

    try {
      const res = await fetch(`${API_BASE}/api/report`, { method: "POST" });
      if (!res.ok) throw new Error(`Report generation failed (${res.status})`);
      const data = await res.json();
      setReportUrl(`${API_BASE}${data.report_url}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(`${msg}. Make sure a scan has been run first.`);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div>
      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "10px",
          textTransform: "uppercase",
          letterSpacing: "0.16em",
          color: "var(--text-ghost)",
          marginBottom: "6px",
        }}
      >
        Deliverable
      </p>
      <h2
        style={{
          fontFamily: "var(--font-sans)",
          fontWeight: 700,
          fontSize: "32px",
          letterSpacing: "-0.02em",
        }}
      >
        Security Report
      </h2>
      <p
        className="mt-2 mb-8 max-w-2xl"
        style={{
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
          fontSize: "16px",
          color: "var(--text-secondary)",
        }}
      >
        Generate a comprehensive PDF security assessment including device inventory,
        vulnerability findings, topology overview, segmentation recommendations, and remediation
        checklist.
      </p>

      <button
        onClick={handleGenerate}
        disabled={generating}
        className="frag-btn-primary"
      >
        {generating ? "Generating Report…" : "Generate Report"}
      </button>

      {error && (
        <p
          className="mt-4"
          style={{
            color: "var(--status-critical)",
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
          }}
        >
          {error}
        </p>
      )}

      {reportUrl && (
        <div className="frag-card mt-6 max-w-xl">
          <p
            className="mb-4"
            style={{
              color: "var(--status-healthy)",
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            ● Report generated successfully
          </p>
          <a
            href={reportUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="frag-btn-secondary inline-block"
          >
            Download PDF Report
          </a>
        </div>
      )}
    </div>
  );
}

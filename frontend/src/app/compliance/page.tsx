"use client";

import { useState, useEffect } from "react";
import ComplianceUpload from "../components/ComplianceUpload";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Framework {
  id: string;
  name: string;
  controls_count: number;
  upload_date: string;
}

interface AssessmentResult {
  assessment_id: number;
  framework: string;
  controls_assessed: number;
  compliant: number;
  partial: number;
  non_compliant: number;
  report_path: string;
}

export default function CompliancePage() {
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [assessing, setAssessing] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<AssessmentResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadFrameworks() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/compliance/frameworks`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setFrameworks(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load frameworks");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFrameworks();
  }, []);

  async function handleAssess(frameworkId: string) {
    setAssessing(frameworkId);
    setLastResult(null);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/compliance/assess`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ framework_id: frameworkId }),
      });
      if (!res.ok) throw new Error(`Assessment failed (${res.status})`);
      const data: AssessmentResult = await res.json();
      setLastResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Assessment failed");
    } finally {
      setAssessing(null);
    }
  }

  const total = lastResult
    ? lastResult.compliant + lastResult.partial + lastResult.non_compliant
    : 0;
  const score = total > 0 ? Math.round((lastResult!.compliant / total) * 100) : 0;

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
        Posture
      </p>
      <h2
        style={{
          fontFamily: "var(--font-sans)",
          fontWeight: 700,
          fontSize: "32px",
          letterSpacing: "-0.02em",
          marginBottom: "32px",
        }}
      >
        Compliance Assessment
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <ComplianceUpload onUploadComplete={loadFrameworks} />

          <div>
            <h3
              className="mb-3"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--text-ghost)",
              }}
            >
              Uploaded Frameworks
            </h3>
            {loading ? (
              <div className="grid grid-cols-1 gap-3">
                {[0, 1].map((i) => (
                  <div
                    key={i}
                    className="h-24 rounded-xl animate-pulse"
                    style={{
                      background: "var(--bg-card)",
                      border: "1px solid color-mix(in srgb, var(--bg-border) 30%, transparent)",
                    }}
                  />
                ))}
              </div>
            ) : error ? (
              <p
                style={{
                  color: "var(--status-critical)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px",
                }}
              >
                ◆ {error}
              </p>
            ) : frameworks.length === 0 ? (
              <p
                style={{
                  color: "var(--text-ghost)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px",
                }}
              >
                No frameworks uploaded yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {frameworks.map((fw) => (
                  <div
                    key={fw.id}
                    className="relative p-6 rounded-xl overflow-hidden"
                    style={{
                      background: "var(--bg-card)",
                      border: "1px solid color-mix(in srgb, var(--bg-border) 30%, transparent)",
                    }}
                  >
                    <div
                      className="absolute top-0 right-0 w-24 h-24 rounded-bl-[100px]"
                      style={{
                        background: "color-mix(in srgb, var(--orange) 8%, transparent)",
                      }}
                    />
                    <div className="relative flex items-start gap-4">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                          background: "color-mix(in srgb, var(--orange) 12%, transparent)",
                          color: "var(--orange-light)",
                        }}
                      >
                        <span className="material-symbols-outlined">verified</span>
                      </div>
                      <div className="flex-1">
                        <p
                          style={{
                            fontFamily: "var(--font-sans)",
                            fontWeight: 700,
                            fontSize: "15px",
                            color: "var(--text-primary)",
                          }}
                        >
                          {fw.name}
                        </p>
                        <p
                          className="mt-1"
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: "10px",
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
                            color: "var(--text-ghost)",
                          }}
                        >
                          {fw.controls_count} controls · ready
                        </p>
                      </div>
                      <button
                        onClick={() => handleAssess(fw.id)}
                        disabled={assessing === fw.id}
                        className="accent-gradient text-white text-[10px] font-semibold uppercase tracking-wider px-4 py-2 rounded-lg disabled:opacity-60"
                        style={{ letterSpacing: "0.12em" }}
                      >
                        {assessing === fw.id ? "Assessing…" : "Assess"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          {lastResult ? (
            <div
              className="p-8 rounded-2xl"
              style={{
                background: "var(--bg-card)",
                border: "1px solid color-mix(in srgb, var(--bg-border) 30%, transparent)",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  color: "var(--text-ghost)",
                }}
              >
                Assessment Result
              </p>
              <h3
                style={{
                  fontFamily: "var(--font-sans)",
                  fontWeight: 700,
                  fontSize: "22px",
                  marginTop: 4,
                  marginBottom: 24,
                }}
              >
                {lastResult.framework}
              </h3>

              <div className="flex justify-center mb-8">
                <div className="relative w-48 h-48">
                  <svg width="192" height="192" viewBox="0 0 192 192">
                    <circle
                      cx="96"
                      cy="96"
                      r="88"
                      fill="none"
                      stroke="var(--bg-elevated)"
                      strokeWidth="12"
                    />
                    <circle
                      cx="96"
                      cy="96"
                      r="88"
                      fill="none"
                      stroke="url(#score-grad)"
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 88}
                      strokeDashoffset={2 * Math.PI * 88 * (1 - score / 100)}
                      transform="rotate(-90 96 96)"
                      style={{ transition: "stroke-dashoffset 600ms ease" }}
                    />
                    <defs>
                      <linearGradient id="score-grad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#D65A31" />
                        <stop offset="100%" stopColor="#E8794F" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span
                      className="accent-gradient-text"
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontWeight: 900,
                        fontSize: "44px",
                        lineHeight: 1,
                      }}
                    >
                      {score}%
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "9px",
                        textTransform: "uppercase",
                        letterSpacing: "0.14em",
                        color: "var(--text-ghost)",
                        marginTop: 6,
                      }}
                    >
                      Compliance
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-6">
                <ResultTile
                  label="Compliant"
                  value={lastResult.compliant}
                  color="var(--status-healthy)"
                />
                <ResultTile
                  label="Partial"
                  value={lastResult.partial}
                  color="var(--status-warning)"
                />
                <ResultTile
                  label="Non-Compliant"
                  value={lastResult.non_compliant}
                  color="var(--status-critical)"
                />
              </div>

              <a
                href={`${API_BASE}/api/compliance/report/${lastResult.assessment_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="accent-gradient flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white font-semibold text-xs uppercase"
                style={{ letterSpacing: "0.12em" }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                  download
                </span>
                Download PDF Report
              </a>
            </div>
          ) : (
            <div
              className="p-12 rounded-2xl flex flex-col items-center justify-center text-center h-full"
              style={{
                background: "var(--bg-deeper)",
                border: "1px dashed color-mix(in srgb, var(--bg-border) 50%, transparent)",
              }}
            >
              <span
                className="material-symbols-outlined mb-3"
                style={{ fontSize: 48, color: "var(--text-ghost)" }}
              >
                fact_check
              </span>
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  color: "var(--text-secondary)",
                  fontSize: 14,
                }}
              >
                Run an assessment to view results.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultTile({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      className="text-center p-4 rounded-xl"
      style={{
        background: "var(--bg-deep)",
        border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "28px",
          fontWeight: 500,
          color,
          lineHeight: 1,
        }}
      >
        {value}
      </p>
      <p
        className="mt-2"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "9px",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "var(--text-ghost)",
        }}
      >
        {label}
      </p>
    </div>
  );
}

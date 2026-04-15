"use client";

import { useState, useEffect } from "react";
import { api, type Device } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface AttackStep {
  from_ip: string;
  from_host: string;
  to_ip: string;
  to_host: string;
  method: string;
  risk: number;
}

interface SimResult {
  path: string[];
  narration: string;
  steps: AttackStep[];
  source: string;
}

export default function SimulatePage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedMac, setSelectedMac] = useState("");
  const [simulating, setSimulating] = useState(false);
  const [result, setResult] = useState<SimResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getDevices()
      .then(setDevices)
      .catch((e: Error) => setError(e.message || "Failed to load devices"));
  }, []);

  async function handleSimulate() {
    if (!selectedMac) return;
    setSimulating(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/ai/attack-sim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_id: selectedMac }),
      });
      if (!res.ok) throw new Error(`Simulation failed (${res.status})`);
      const data: SimResult = await res.json();
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Simulation failed");
    } finally {
      setSimulating(false);
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
        Lateral Movement
      </p>
      <h2
        style={{
          fontFamily: "var(--font-sans)",
          fontWeight: 700,
          fontSize: "32px",
          letterSpacing: "-0.02em",
        }}
      >
        Attack Path Simulation
      </h2>
      <p
        className="mt-2 mb-8"
        style={{
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
          fontSize: "16px",
          color: "var(--text-secondary)",
        }}
      >
        Select a device to simulate lateral movement from a compromised host.
      </p>

      <div className="flex gap-3 mb-6">
        <select
          value={selectedMac}
          onChange={(e) => setSelectedMac(e.target.value)}
          className="frag-input flex-1"
        >
          <option value="">Select a device…</option>
          {devices.map((d) => (
            <option key={d.mac} value={d.mac}>
              {d.ip} — {d.hostname || d.vendor || "Unknown"} (Risk: {d.risk_score})
            </option>
          ))}
        </select>
        <button
          onClick={handleSimulate}
          disabled={!selectedMac || simulating}
          className="frag-btn-primary"
        >
          {simulating ? "Simulating…" : "Simulate Compromise"}
        </button>
      </div>

      {error && (
        <div
          className="mb-4 px-4 py-3 rounded-xl"
          style={{
            background: "color-mix(in srgb, var(--status-critical) 12%, transparent)",
            border: "1px solid color-mix(in srgb, var(--status-critical) 35%, transparent)",
            color: "var(--status-critical)",
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
          }}
        >
          ◆ {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {/* Attack path visualization */}
          {result.steps.length > 0 && (
            <div className="frag-card">
              <h3
                className="mb-4"
                style={{
                  fontFamily: "var(--font-sans)",
                  fontWeight: 600,
                  fontSize: "13px",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Attack Path · {result.steps.length} hops
              </h3>
              <div className="space-y-3">
                {result.steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div
                      className="px-3 py-2 rounded-md"
                      style={{
                        background: "var(--black)",
                        color: "var(--text-primary)",
                        fontFamily: "var(--font-mono)",
                        fontSize: "12px",
                        border: "1px solid color-mix(in srgb, var(--bg-border) 40%, transparent)",
                      }}
                    >
                      {step.from_ip}
                    </div>
                    <div className="flex flex-col items-center min-w-0 flex-1">
                      <span style={{ color: "var(--status-critical)", fontSize: "20px", lineHeight: 1 }}>→</span>
                      <span
                        className="truncate max-w-full"
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "10px",
                          color: "var(--text-ghost)",
                          marginTop: "2px",
                        }}
                      >
                        {step.method}
                      </span>
                    </div>
                    <div
                      className="px-3 py-2 rounded-md"
                      style={{
                        background: "var(--black)",
                        color: "var(--status-critical)",
                        fontFamily: "var(--font-mono)",
                        fontSize: "12px",
                        border: "1px solid color-mix(in srgb, var(--status-critical) 30%, transparent)",
                      }}
                    >
                      {step.to_ip}
                    </div>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "10px",
                        color: "var(--text-ghost)",
                      }}
                    >
                      Risk {step.risk}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Narration */}
          <div className="frag-card">
            <h3
              className="mb-4"
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 600,
                fontSize: "13px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Attack Narration
            </h3>
            <div
              className="whitespace-pre-wrap"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "13px",
                lineHeight: 1.7,
                color: "var(--text-secondary)",
              }}
            >
              {result.narration}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

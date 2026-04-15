"use client";

import { useState, useEffect } from "react";
import { api, type Alert } from "@/lib/api";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "var(--status-critical)",
  high: "var(--orange-light)",
  medium: "var(--status-warning)",
  low: "var(--status-healthy)",
};

export default function ThreatFeed() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("");

  useEffect(() => {
    loadAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAlerts() {
    setError(null);
    try {
      const data = await api.getAlerts(filter ? { severity: filter } : undefined);
      setAlerts(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load alerts");
    } finally {
      setLoading(false);
    }
  }

  async function handleAcknowledge(id: number) {
    await api.acknowledgeAlert(id);
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a))
    );
  }

  const filtered = filter ? alerts.filter((a) => a.severity === filter) : alerts;

  return (
    <div>
      <div className="flex gap-2 mb-5">
        {["", "critical", "high", "medium", "low"].map((s) => {
          const active = filter === s;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              style={{
                padding: "6px 14px",
                borderRadius: "8px",
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                background: active ? "var(--orange)" : "var(--bg-card)",
                color: active ? "var(--white)" : "var(--text-secondary)",
                border: active
                  ? "1px solid var(--orange)"
                  : "1px solid color-mix(in srgb, var(--bg-border) 40%, transparent)",
                transition: "all 120ms ease",
              }}
            >
              {s || "All"}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-16 rounded-xl animate-pulse"
              style={{
                background: "var(--bg-card)",
                border: "1px solid color-mix(in srgb, var(--bg-border) 30%, transparent)",
              }}
            />
          ))}
        </div>
      ) : error ? (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{
            background: "color-mix(in srgb, var(--status-critical) 12%, transparent)",
            border: "1px solid color-mix(in srgb, var(--status-critical) 35%, transparent)",
          }}
        >
          <span style={{ color: "var(--status-critical)", fontSize: "16px" }}>◆</span>
          <div className="flex-1 min-w-0">
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--status-critical)",
              }}
            >
              Failed to load alerts
            </p>
            <p
              className="mt-1"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                color: "var(--text-secondary)",
              }}
            >
              {error}
            </p>
          </div>
          <button
            onClick={() => {
              setLoading(true);
              loadAlerts();
            }}
            className="frag-btn-secondary"
          >
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <p style={{ color: "var(--text-ghost)", fontFamily: "var(--font-mono)", fontSize: "12px" }}>
          No alerts.
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((alert) => {
            const sevColor = SEVERITY_COLORS[alert.severity] || "var(--text-secondary)";
            return (
              <div
                key={alert.id}
                className="flex items-start gap-3 p-4 rounded-xl"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid color-mix(in srgb, var(--bg-border) 30%, transparent)",
                  borderLeft: `3px solid ${sevColor}`,
                  opacity: alert.acknowledged ? 0.55 : 1,
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className="rounded-md"
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "10px",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        padding: "3px 8px",
                        color: sevColor,
                        background: `color-mix(in srgb, ${sevColor} 18%, transparent)`,
                        border: `1px solid color-mix(in srgb, ${sevColor} 30%, transparent)`,
                      }}
                    >
                      {alert.severity}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "10px",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: "var(--text-ghost)",
                      }}
                    >
                      {alert.alert_type}
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                    {alert.message}
                  </p>
                  <p
                    className="mt-1"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "10px",
                      color: "var(--text-ghost)",
                    }}
                  >
                    {new Date(alert.timestamp).toLocaleString()}
                  </p>
                </div>
                {!alert.acknowledged && (
                  <button
                    onClick={() => handleAcknowledge(alert.id)}
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "10px",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      color: "var(--text-secondary)",
                      background: "var(--bg-elevated)",
                      border: "1px solid color-mix(in srgb, var(--bg-border) 50%, transparent)",
                    }}
                  >
                    Ack
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

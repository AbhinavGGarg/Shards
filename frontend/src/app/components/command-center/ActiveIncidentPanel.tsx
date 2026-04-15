"use client";

import type { ActiveIncident, IncidentRiskLevel } from "./types";

interface ActiveIncidentPanelProps {
  incident: ActiveIncident;
  onInvestigate: () => void;
  onIsolate: () => void;
  onIgnore: () => void;
  isolated: boolean;
}

const riskStyles: Record<IncidentRiskLevel, { label: string; color: string; bg: string }> = {
  LOW: {
    label: "Low",
    color: "var(--status-healthy)",
    bg: "color-mix(in srgb, var(--status-healthy) 15%, transparent)",
  },
  MEDIUM: {
    label: "Medium",
    color: "var(--status-warning)",
    bg: "color-mix(in srgb, var(--status-warning) 16%, transparent)",
  },
  HIGH: {
    label: "High",
    color: "var(--status-critical)",
    bg: "color-mix(in srgb, var(--status-critical) 16%, transparent)",
  },
  CRITICAL: {
    label: "Critical",
    color: "var(--status-critical)",
    bg: "color-mix(in srgb, var(--status-critical) 24%, transparent)",
  },
};

export default function ActiveIncidentPanel({
  incident,
  onInvestigate,
  onIsolate,
  onIgnore,
  isolated,
}: ActiveIncidentPanelProps) {
  const risk = riskStyles[incident.riskLevel];

  return (
    <section
      className="command-panel p-6 lg:p-7"
      style={{
        background:
          "radial-gradient(120% 140% at 0% 0%, color-mix(in srgb, var(--status-critical) 16%, transparent) 0%, transparent 45%), var(--bg-card)",
      }}
    >
      <div className="flex flex-wrap items-start gap-4 justify-between">
        <div className="min-w-[280px] flex-1">
          <p className="command-kicker">Active Incident</p>
          <h1
            className="mt-2 text-2xl lg:text-4xl font-bold leading-tight"
            style={{ fontFamily: "var(--font-sans)", letterSpacing: "-0.02em" }}
          >
            {incident.title}
          </h1>
          <p className="mt-3 text-sm lg:text-base" style={{ color: "var(--text-secondary)" }}>
            {incident.summary}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 min-w-[280px] lg:min-w-[360px]">
          <Metric label="Affected Device" value={incident.affectedDevice} subValue={incident.affectedIp} />
          <Metric label="Confidence" value={`${incident.confidence}%`} subValue="AI Correlation" />
          <Metric label="Risk Level" value={risk.label} color={risk.color} subValue="Threat Severity" />
          <Metric
            label="Detected"
            value={new Date(incident.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            subValue={new Date(incident.timestamp).toLocaleDateString()}
          />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <span
          className="inline-flex items-center gap-2 rounded-full px-3 py-1.5"
          style={{
            color: risk.color,
            background: risk.bg,
            border: `1px solid color-mix(in srgb, ${risk.color} 35%, transparent)`,
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          <span className="w-2 h-2 rounded-full alert-dot" style={{ background: risk.color }} />
          Incident {risk.label}
        </span>

        <button onClick={onInvestigate} className="command-btn command-btn-primary">
          <span className="material-symbols-outlined">manage_search</span>
          Investigate
        </button>
        <button
          onClick={onIsolate}
          className="command-btn"
          style={{
            borderColor: isolated ? "var(--status-healthy)" : "color-mix(in srgb, var(--status-warning) 35%, transparent)",
            color: isolated ? "var(--status-healthy)" : "var(--status-warning)",
            background: isolated
              ? "color-mix(in srgb, var(--status-healthy) 12%, transparent)"
              : "color-mix(in srgb, var(--status-warning) 10%, transparent)",
          }}
        >
          <span className="material-symbols-outlined">lan_disconnect</span>
          {isolated ? "Device Isolated" : "Isolate Device"}
        </button>
        <button onClick={onIgnore} className="command-btn command-btn-muted">
          <span className="material-symbols-outlined">visibility_off</span>
          Ignore
        </button>
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  subValue,
  color,
}: {
  label: string;
  value: string;
  subValue: string;
  color?: string;
}) {
  return (
    <div className="rounded-xl px-3.5 py-3" style={{ background: "var(--bg-panel)", border: "1px solid var(--border-soft)" }}>
      <p className="command-kicker">{label}</p>
      <p
        className="mt-1 text-lg font-semibold truncate"
        style={{ fontFamily: "var(--font-sans)", color: color ?? "var(--text-primary)" }}
      >
        {value}
      </p>
      <p className="text-xs mt-1" style={{ color: "var(--text-ghost)" }}>
        {subValue}
      </p>
    </div>
  );
}

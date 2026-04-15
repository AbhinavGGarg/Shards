"use client";

import type { ActiveIncident } from "./types";

interface AIInsightsPanelProps {
  incident: ActiveIncident;
  onIsolate: () => void;
  onBlockIp: () => void;
  onDeepScan: () => void;
  blockActive: boolean;
  deepScanRunning: boolean;
}

export default function AIInsightsPanel({
  incident,
  onIsolate,
  onBlockIp,
  onDeepScan,
  blockActive,
  deepScanRunning,
}: AIInsightsPanelProps) {
  return (
    <aside className="command-panel p-5 h-full min-h-[560px] flex flex-col">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="command-kicker">AI Threat Analyst</p>
          <h3 className="text-xl font-semibold mt-1" style={{ letterSpacing: "-0.015em" }}>
            Insight Engine
          </h3>
        </div>
        <span className="command-pill command-pill-info">
          <span className="material-symbols-outlined">auto_awesome</span>
          {incident.confidence}% confidence
        </span>
      </div>

      <section className="mt-5 command-inner-panel">
        <h4 className="command-subhead">Why this was flagged</h4>
        <ul className="mt-2 space-y-2.5">
          {incident.whyFlagged.map((reason) => (
            <li key={reason} className="command-list-item">
              <span className="material-symbols-outlined">arrow_outward</span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-4 command-inner-panel">
        <h4 className="command-subhead">Suggested actions</h4>
        <ul className="mt-2 space-y-2.5">
          {incident.suggestedActions.map((action) => (
            <li key={action} className="command-list-item">
              <span className="material-symbols-outlined">task_alt</span>
              <span>{action}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-4 command-inner-panel">
        <h4 className="command-subhead">Related vulnerabilities</h4>
        <div className="mt-2 flex flex-wrap gap-2">
          {incident.relatedVulnerabilities.map((vuln) => (
            <span key={vuln} className="command-tag">
              {vuln}
            </span>
          ))}
        </div>
      </section>

      <section className="mt-4 command-inner-panel">
        <h4 className="command-subhead">Rapid response</h4>
        <div className="mt-3 space-y-2.5">
          <button onClick={onIsolate} className="command-btn w-full justify-center">
            <span className="material-symbols-outlined">shield_lock</span>
            Isolate Device
          </button>
          <button
            onClick={onBlockIp}
            className="command-btn w-full justify-center"
            style={{
              color: blockActive ? "var(--status-healthy)" : "var(--status-critical)",
              borderColor: blockActive
                ? "color-mix(in srgb, var(--status-healthy) 40%, transparent)"
                : "color-mix(in srgb, var(--status-critical) 40%, transparent)",
              background: blockActive
                ? "color-mix(in srgb, var(--status-healthy) 12%, transparent)"
                : "color-mix(in srgb, var(--status-critical) 12%, transparent)",
            }}
          >
            <span className="material-symbols-outlined">gpp_bad</span>
            {blockActive ? "IP Blocked" : "Block IP"}
          </button>
          <button
            onClick={onDeepScan}
            className="command-btn command-btn-primary w-full justify-center"
            disabled={deepScanRunning}
          >
            <span className={`material-symbols-outlined ${deepScanRunning ? "animate-spin" : ""}`}>
              {deepScanRunning ? "progress_activity" : "radar"}
            </span>
            {deepScanRunning ? "Running Deep Scan" : "Run Deep Scan"}
          </button>
        </div>
      </section>
    </aside>
  );
}

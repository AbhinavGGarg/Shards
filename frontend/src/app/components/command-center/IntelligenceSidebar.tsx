"use client";

import type { ThreatSeverityBuckets, VulnerableDeviceSummary } from "./types";

interface IntelligenceSidebarProps {
  avgRisk: number;
  riskTrend: number[];
  threatBuckets: ThreatSeverityBuckets;
  vulnerableDevices: VulnerableDeviceSummary[];
  totalDevices: number;
  lastScan: string | null;
}

export default function IntelligenceSidebar({
  avgRisk,
  riskTrend,
  threatBuckets,
  vulnerableDevices,
  totalDevices,
  lastScan,
}: IntelligenceSidebarProps) {
  const maxTrend = Math.max(...riskTrend, 1);

  return (
    <aside className="flex flex-col gap-4">
      <section className="command-panel p-4">
        <p className="command-kicker">Risk Posture</p>
        <div className="mt-2 flex items-end justify-between gap-2">
          <p className="text-4xl font-bold" style={{ letterSpacing: "-0.03em" }}>
            {avgRisk.toFixed(1)}
          </p>
          <span className="command-pill command-pill-warning">Trend: 24h</span>
        </div>
        <svg className="w-full h-16 mt-3" viewBox="0 0 220 64" preserveAspectRatio="none" aria-label="Risk trend">
          <polyline
            fill="none"
            stroke="var(--status-warning)"
            strokeWidth="2"
            points={riskTrend
              .map((point, i) => {
                const x = (i / Math.max(riskTrend.length - 1, 1)) * 220;
                const y = 56 - (point / maxTrend) * 44;
                return `${x},${y}`;
              })
              .join(" ")}
          />
        </svg>
      </section>

      <section className="command-panel p-4">
        <p className="command-kicker">Active Threats</p>
        <div className="mt-3 space-y-2">
          <SeverityRow label="Critical" value={threatBuckets.critical} color="var(--status-critical)" />
          <SeverityRow label="High" value={threatBuckets.high} color="var(--status-critical)" muted />
          <SeverityRow label="Medium" value={threatBuckets.medium} color="var(--status-warning)" />
          <SeverityRow label="Low" value={threatBuckets.low} color="var(--status-healthy)" />
        </div>
      </section>

      <section className="command-panel p-4">
        <p className="command-kicker">Vulnerable Devices</p>
        <div className="mt-3 space-y-2.5">
          {vulnerableDevices.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-ghost)" }}>
              No high-risk devices detected.
            </p>
          ) : (
            vulnerableDevices.map((device) => (
              <div key={device.id} className="command-list-row">
                <div>
                  <p className="font-medium text-sm">{device.label}</p>
                  <p className="text-xs" style={{ color: "var(--text-ghost)" }}>
                    {device.ip} • {device.openPortCount} open ports
                  </p>
                </div>
                <span className="command-pill command-pill-critical">{Math.round(device.risk)}</span>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="command-panel p-4">
        <p className="command-kicker">Last Scan Results</p>
        <div className="mt-3 text-sm space-y-2" style={{ color: "var(--text-secondary)" }}>
          <p>
            <span style={{ color: "var(--text-ghost)" }}>Assets monitored: </span>
            <strong style={{ color: "var(--text-primary)" }}>{totalDevices}</strong>
          </p>
          <p>
            <span style={{ color: "var(--text-ghost)" }}>Latest sweep: </span>
            <strong style={{ color: "var(--text-primary)" }}>
              {lastScan ? new Date(lastScan).toLocaleString() : "No scans recorded"}
            </strong>
          </p>
          <p className="command-inline-status">
            <span className="w-2 h-2 rounded-full glow-pulse" style={{ background: "var(--status-info)" }} />
            Sensor telemetry synchronized
          </p>
        </div>
      </section>
    </aside>
  );
}

function SeverityRow({
  label,
  value,
  color,
  muted,
}: {
  label: string;
  value: number;
  color: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: "var(--bg-panel)" }}>
      <span className="text-xs uppercase tracking-wider" style={{ color: muted ? "var(--text-secondary)" : "var(--text-ghost)" }}>
        {label}
      </span>
      <span
        className="font-semibold text-sm"
        style={{
          color,
          fontFamily: "var(--font-mono)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

"use client";

import type { Stats } from "@/lib/api";

interface TopologyStatsProps {
  stats: Stats | null;
  loading: boolean;
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  color?: string;
  progress?: number; // 0..1
}

function StatCard({ label, value, icon, color, progress = 0.75 }: StatCardProps) {
  const c = color || "var(--orange)";
  const circ = 2 * Math.PI * 24;
  return (
    <div
      className="rounded-2xl p-5 flex items-center gap-4"
      style={{
        background: "var(--bg-card)",
        border: "1px solid color-mix(in srgb, var(--bg-border) 30%, transparent)",
      }}
    >
      <div className="relative w-14 h-14 flex-shrink-0">
        <svg width="56" height="56" viewBox="0 0 56 56">
          <circle cx="28" cy="28" r="24" fill="none" stroke="var(--bg-elevated)" strokeWidth="4" />
          <circle
            cx="28"
            cy="28"
            r="24"
            fill="none"
            stroke={c}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - progress)}
            transform="rotate(-90 28 28)"
            style={{ transition: "stroke-dashoffset 600ms ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="material-symbols-outlined" style={{ color: c, fontSize: 20 }}>
            {icon}
          </span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "9px",
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            color: "var(--text-ghost)",
            marginBottom: "4px",
          }}
        >
          {label}
        </p>
        <p
          className="truncate"
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 700,
            fontSize: "24px",
            letterSpacing: "-0.02em",
            color: "var(--text-primary)",
            lineHeight: 1,
          }}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

export default function TopologyStats({ stats, loading }: TopologyStatsProps) {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded-2xl p-5 animate-pulse h-24"
            style={{
              background: "var(--bg-card)",
              border: "1px solid color-mix(in srgb, var(--bg-border) 30%, transparent)",
            }}
          />
        ))}
      </div>
    );
  }

  const riskColor =
    stats.avg_risk_score > 50
      ? "var(--status-critical)"
      : stats.avg_risk_score > 25
        ? "var(--status-warning)"
        : "var(--status-healthy)";

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        label="Devices"
        value={stats.total_devices}
        icon="devices"
        color="var(--orange-light)"
        progress={Math.min(1, stats.total_devices / 20)}
      />
      <StatCard
        label="Avg Risk"
        value={stats.avg_risk_score}
        icon="speed"
        color={riskColor}
        progress={Math.min(1, stats.avg_risk_score / 100)}
      />
      <StatCard
        label="Active Alerts"
        value={stats.unacknowledged_alerts}
        icon="notification_important"
        color={stats.unacknowledged_alerts > 0 ? "var(--status-critical)" : "var(--status-healthy)"}
        progress={stats.unacknowledged_alerts > 0 ? 0.85 : 0.1}
      />
      <StatCard
        label="Last Scan"
        value={stats.last_scan ? new Date(stats.last_scan).toLocaleTimeString() : "Never"}
        icon="radar"
        color="var(--status-info)"
        progress={stats.last_scan ? 1 : 0}
      />
    </div>
  );
}

"use client";

interface RiskScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
}

function getRiskColor(score: number): string {
  if (score <= 20) return "var(--status-healthy)";
  if (score <= 50) return "var(--status-warning)";
  return "var(--status-critical)";
}

function getRiskLabel(score: number): string {
  if (score <= 20) return "Low";
  if (score <= 50) return "Medium";
  if (score <= 75) return "High";
  return "Critical";
}

export default function RiskScoreBadge({ score, size = "md" }: RiskScoreBadgeProps) {
  const color = getRiskColor(score);
  const label = getRiskLabel(score);

  const sizeStyles = {
    sm: { fontSize: "10px", padding: "3px 8px" },
    md: { fontSize: "11px", padding: "4px 12px" },
    lg: { fontSize: "13px", padding: "6px 14px" },
  }[size];

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md"
      style={{
        ...sizeStyles,
        fontFamily: "var(--font-mono)",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        color: color,
        background: `color-mix(in srgb, ${color} 18%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {Math.round(score)} {label}
    </span>
  );
}

export { getRiskColor, getRiskLabel };

"use client";

interface ShardsLogoProps {
  size?: number;
  variant?: "icon" | "wordmark" | "wordmark-accent";
  className?: string;
}

export default function ShardsLogo({
  size = 32,
  variant = "wordmark",
  className = "",
}: ShardsLogoProps) {
  const titleColor = variant === "wordmark-accent" ? "var(--status-info)" : "var(--text-primary)";

  return (
    <span className={`inline-flex items-center ${className}`}>
      <span className="leading-none">
        <span
          style={{
            display: "block",
            fontFamily: "var(--font-sans)",
            fontWeight: 700,
            fontSize: Math.max(16, Math.round(size * 0.48)),
            letterSpacing: "-0.02em",
            color: titleColor,
          }}
        >
          Shards
        </span>
        <span
          style={{
            display: "block",
            marginTop: 3,
            fontFamily: "var(--font-mono)",
            fontSize: Math.max(9, Math.round(size * 0.2)),
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--text-ghost)",
          }}
        >
          Cyber Defense
        </span>
      </span>
    </span>
  );
}

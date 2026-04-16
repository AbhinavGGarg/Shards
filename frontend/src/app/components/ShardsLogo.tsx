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
  const icon = (
    <span
      className="inline-flex items-center justify-center rounded-xl"
      style={{
        width: size,
        height: size,
        background:
          "radial-gradient(120% 120% at 20% 20%, rgba(42, 216, 255, 0.28) 0%, rgba(17, 30, 46, 0.95) 62%)",
        border: "1px solid color-mix(in srgb, var(--status-info) 40%, transparent)",
      }}
    >
      <svg viewBox="0 0 24 24" width={Math.round(size * 0.62)} height={Math.round(size * 0.62)} aria-hidden="true">
        <path
          d="M12 2L4 6v6c0 5 3.4 9.4 8 10 4.6-.6 8-5 8-10V6l-8-4z"
          fill="none"
          stroke="var(--status-info)"
          strokeWidth="1.8"
        />
        <path
          d="M8.2 12.2l2.3 2.3 5.3-5.4"
          fill="none"
          stroke="var(--status-healthy)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );

  if (variant === "icon") {
    return <span className={className}>{icon}</span>;
  }

  const titleColor = variant === "wordmark-accent" ? "var(--status-info)" : "var(--text-primary)";

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      {icon}
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

"use client";

import ThreatFeed from "../components/ThreatFeed";

export default function ThreatsPage() {
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
        Anomaly Stream
      </p>
      <h2
        style={{
          fontFamily: "var(--font-sans)",
          fontWeight: 700,
          fontSize: "32px",
          letterSpacing: "-0.02em",
          marginBottom: "24px",
        }}
      >
        Threat Feed
      </h2>
      <ThreatFeed />
    </div>
  );
}

"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Fragments] Unhandled error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div
        className="frag-card max-w-xl text-center"
        style={{ borderColor: "color-mix(in srgb, var(--status-critical) 40%, transparent)" }}
      >
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            textTransform: "uppercase",
            letterSpacing: "0.16em",
            color: "var(--status-critical)",
            marginBottom: "8px",
          }}
        >
          ◆ Fault detected
        </p>
        <h2
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 700,
            fontSize: "24px",
            letterSpacing: "-0.01em",
            color: "var(--text-primary)",
            marginBottom: "12px",
          }}
        >
          Something fragmented
        </h2>
        <p
          className="mb-6"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "13px",
            color: "var(--text-secondary)",
          }}
        >
          {error.message || "An unexpected error occurred while rendering this view."}
        </p>
        {error.digest && (
          <p
            className="mb-6"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              color: "var(--text-ghost)",
            }}
          >
            digest: {error.digest}
          </p>
        )}
        <button onClick={reset} className="frag-btn-primary">
          Try Again
        </button>
      </div>
    </div>
  );
}

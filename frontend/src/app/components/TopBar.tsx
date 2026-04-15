"use client";

export default function TopBar() {
  return (
    <header
      className="h-16 flex items-center justify-between px-8 flex-shrink-0"
      style={{
        background: "var(--bg-sidebar)",
        borderBottom: "1px solid color-mix(in srgb, var(--bg-border) 30%, transparent)",
      }}
    >
      <div
        className="flex items-center gap-3 w-[360px] h-10 px-4 rounded-full"
        style={{
          background: "var(--bg-deep)",
          border: "1px solid color-mix(in srgb, var(--bg-border) 40%, transparent)",
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontSize: 18, color: "var(--text-ghost)" }}
        >
          search
        </span>
        <input
          type="text"
          placeholder="Search devices, CVEs, hosts…"
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: "var(--text-primary)", fontFamily: "var(--font-sans)" }}
        />
        <kbd
          className="px-1.5 py-0.5 text-[10px] rounded"
          style={{
            background: "var(--bg-elevated)",
            color: "var(--text-ghost)",
            fontFamily: "var(--font-mono)",
          }}
        >
          ⌘K
        </kbd>
      </div>

      <div className="flex items-center gap-4">
        <div
          className="stitch-pill"
          style={{
            background: "color-mix(in srgb, var(--status-healthy) 12%, transparent)",
            color: "var(--status-healthy)",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full glow-pulse" style={{ background: "currentColor" }} />
          System Healthy
        </div>
        <button
          className="w-9 h-9 rounded-full flex items-center justify-center relative"
          style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            notifications
          </span>
          <span
            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
            style={{ background: "var(--status-critical)" }}
          />
        </button>
        <button
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            settings
          </span>
        </button>
        <div
          className="w-9 h-9 rounded-full accent-gradient flex items-center justify-center text-white font-bold text-xs"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          FR
        </div>
      </div>
    </header>
  );
}

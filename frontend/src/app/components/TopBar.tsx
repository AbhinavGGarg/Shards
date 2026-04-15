"use client";

export default function TopBar() {
  return (
    <header
      className="h-16 flex items-center justify-between px-6 lg:px-8 flex-shrink-0"
      style={{
        background: "color-mix(in srgb, var(--bg-sidebar) 86%, transparent)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid var(--border-soft)",
      }}
    >
      <div
        className="flex items-center gap-3 w-full max-w-[560px] h-10 px-4 rounded-xl"
        style={{
          background: "var(--bg-panel)",
          border: "1px solid var(--border-soft)",
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--text-ghost)" }}>
          search
        </span>
        <input
          type="text"
          placeholder="Search assets, indicators, CVEs, users…"
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: "var(--text-primary)", fontFamily: "var(--font-sans)" }}
        />
        <kbd
          className="px-2 py-0.5 text-[10px] rounded"
          style={{
            background: "rgba(38, 52, 73, 0.65)",
            color: "var(--text-ghost)",
            fontFamily: "var(--font-mono)",
          }}
        >
          ⌘K
        </kbd>
      </div>

      <div className="flex items-center gap-3 lg:gap-4 pl-4">
        <div className="command-pill command-pill-safe hidden sm:inline-flex">
          <span className="w-1.5 h-1.5 rounded-full glow-pulse" style={{ background: "currentColor" }} />
          System healthy
        </div>

        <button
          className="w-9 h-9 rounded-lg flex items-center justify-center relative"
          style={{ background: "var(--bg-panel)", color: "var(--text-secondary)", border: "1px solid var(--border-soft)" }}
          title="Notifications"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            notifications
          </span>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full alert-dot" style={{ background: "var(--status-critical)" }} />
        </button>

        <button
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: "var(--bg-panel)", color: "var(--text-secondary)", border: "1px solid var(--border-soft)" }}
          title="Settings"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            settings
          </span>
        </button>

        <button
          className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold"
          style={{
            background: "linear-gradient(135deg, #2ad8ff 0%, #3199ff 100%)",
            color: "white",
            fontFamily: "var(--font-sans)",
          }}
          title="Profile"
        >
          FR
        </button>
      </div>
    </header>
  );
}

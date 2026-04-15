"use client";

import Link from "next/link";
import FragmentsLogo from "./FragmentsLogo";

export default function TopBar() {
  return (
    <header
      className="h-16 flex items-center justify-between gap-4 px-4 lg:px-6"
      style={{
        background: "color-mix(in srgb, var(--bg-sidebar) 88%, transparent)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border-soft)",
      }}
    >
      <Link href="/" className="flex-shrink-0">
        <FragmentsLogo size={34} variant="wordmark-accent" />
      </Link>

      <div
        className="hidden md:flex items-center gap-3 h-10 px-4 rounded-xl flex-1 max-w-[760px]"
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
          placeholder="Search hosts, indicators, processes, CVEs…"
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: "var(--text-primary)", fontFamily: "var(--font-sans)" }}
        />
      </div>

      <div className="flex items-center gap-2.5">
        <div className="command-pill command-pill-safe hidden xl:inline-flex">
          <span className="w-1.5 h-1.5 rounded-full glow-pulse" style={{ background: "currentColor" }} />
          Monitoring
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

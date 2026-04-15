import type { Metadata } from "next";
import "./globals.css";
import FragmentsLogo from "./components/FragmentsLogo";
import SidebarNav from "./components/SidebarNav";
import TopBar from "./components/TopBar";
import BottomStatusBar from "./components/BottomStatusBar";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Fragments — Network Security Platform",
  description: "AI-Powered Network Security Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/icon?family=Material+Symbols+Outlined"
        />
      </head>
      <body
        className="min-h-screen flex"
        style={{
          background: "var(--bg-deep)",
          color: "var(--text-primary)",
          fontFamily: "var(--font-sans)",
        }}
      >
        <nav
          className="w-64 flex-shrink-0 flex flex-col h-screen sticky top-0"
          style={{
            background: "var(--bg-sidebar)",
            borderRight: "1px solid color-mix(in srgb, var(--bg-border) 30%, transparent)",
          }}
        >
          <div
            className="px-5 py-6"
            style={{
              borderBottom: "1px solid color-mix(in srgb, var(--bg-border) 30%, transparent)",
            }}
          >
            <Link href="/" className="inline-flex">
              <FragmentsLogo size={38} variant="wordmark" />
            </Link>
            <p
              className="mt-2"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--text-ghost)",
              }}
            >
              Network Terrain
            </p>
          </div>

          <SidebarNav />

          <div className="px-4 pb-4 pt-2">
            <Link
              href="/simulate"
              className="accent-gradient flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white font-semibold text-xs uppercase tracking-wider transition-transform hover:scale-[1.02]"
              style={{ letterSpacing: "0.12em" }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                bolt
              </span>
              Simulate Attack
            </Link>
          </div>

          <div
            className="px-5 py-3 flex items-center justify-between"
            style={{
              borderTop: "1px solid color-mix(in srgb, var(--bg-border) 30%, transparent)",
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "var(--text-ghost)",
            }}
          >
            <span>v0.1.0</span>
            <span className="flex items-center gap-1.5" style={{ color: "var(--orange-light)" }}>
              <span className="w-1.5 h-1.5 rounded-full glow-pulse" style={{ background: "var(--orange)" }} />
              Live
            </span>
          </div>
        </nav>

        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-auto">
            <div className="p-8 max-w-[1600px] mx-auto">{children}</div>
          </main>
          <BottomStatusBar />
        </div>
      </body>
    </html>
  );
}

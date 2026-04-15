import type { Metadata } from "next";
import "./globals.css";
import SidebarNav from "./components/SidebarNav";
import TopBar from "./components/TopBar";
import BottomStatusBar from "./components/BottomStatusBar";

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
        className="min-h-screen flex flex-col"
        style={{
          background: "var(--bg-deep)",
          color: "var(--text-primary)",
          fontFamily: "var(--font-sans)",
        }}
      >
        <div className="sticky top-0 z-40">
          <TopBar />
          <div
            className="px-4 lg:px-8 py-2"
            style={{
              background: "color-mix(in srgb, var(--bg-sidebar) 84%, transparent)",
              backdropFilter: "blur(10px)",
              borderBottom: "1px solid var(--border-soft)",
            }}
          >
            <SidebarNav />
          </div>
        </div>

        <main className="flex-1 overflow-auto">
          <div className="p-4 lg:p-8 max-w-[1800px] mx-auto">{children}</div>
        </main>

        <BottomStatusBar />
      </body>
    </html>
  );
}

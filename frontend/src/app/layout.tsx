import type { Metadata } from "next";
import "./globals.css";
import TopBar from "./components/TopBar";

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
        </div>

        <main className="flex-1 overflow-auto">
          <div className="p-4 lg:p-6 max-w-[1900px] mx-auto">{children}</div>
        </main>
      </body>
    </html>
  );
}

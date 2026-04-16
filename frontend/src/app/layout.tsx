import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app/app-shell";

export const metadata: Metadata = {
  title: "Shards — Network Security Platform",
  description: "AI-powered cybersecurity SaaS operations platform",
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
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { AppHeader } from "./header";
import { DesktopSidebar } from "./sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMissionRoute = pathname === "/";

  if (isMissionRoute) {
    return (
      <div className="min-h-screen bg-[color:var(--bg-deep)] text-[color:var(--text-primary)]">
        <main className="min-h-screen p-3 sm:p-4 lg:p-6">
          <div className="mx-auto max-w-[1700px]">{children}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[color:var(--bg-deep)] text-[color:var(--text-primary)]">
      <DesktopSidebar />
      <div className="lg:pl-72 min-h-screen flex flex-col">
        <AppHeader />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-[1500px]">{children}</div>
        </main>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppHeader } from "./header";
import { DesktopSidebar } from "./sidebar";
import { isAuthenticated } from "@/lib/auth";

function isPublicRoute(pathname: string): boolean {
  return pathname === "/" || pathname.startsWith("/auth");
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const publicRoute = isPublicRoute(pathname);
  const [authResolved, setAuthResolved] = React.useState(publicRoute);
  const [authed, setAuthed] = React.useState(publicRoute ? true : false);

  React.useEffect(() => {
    if (publicRoute) {
      setAuthResolved(true);
      setAuthed(true);
      return;
    }

    const loggedIn = isAuthenticated();
    setAuthed(loggedIn);
    setAuthResolved(true);

    if (!loggedIn) {
      router.replace(`/auth?next=${encodeURIComponent(pathname)}`);
    }
  }, [pathname, publicRoute, router]);

  if (publicRoute) {
    return (
      <div className="min-h-screen bg-[color:var(--bg-deep)] text-[color:var(--text-primary)]">
        {children}
      </div>
    );
  }

  if (!authResolved || !authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[color:var(--bg-deep)] text-[color:var(--text-primary)]">
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[color:var(--bg-card)] px-4 py-3 text-sm text-[color:var(--text-secondary)]">
          <span className="h-4 w-4 rounded-full border-2 border-[color:var(--status-info)] border-t-transparent animate-spin" />
          Verifying secure session...
        </div>
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

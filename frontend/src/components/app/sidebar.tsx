"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import ShardsLogo from "@/app/components/ShardsLogo";
import { primaryNav, secondaryNav } from "./navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import * as React from "react";

function NavContent({ mobile = false, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className={cn("flex h-full flex-col", mobile ? "min-h-[70vh]" : "")}> 
      <div className="px-4 py-5">
        <Link href="/dashboard" className="inline-flex" onClick={onNavigate}>
          <ShardsLogo size={34} variant="wordmark-accent" />
        </Link>
      </div>

      <nav className="px-3 space-y-1">
        {primaryNav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-[color:var(--status-info)]/15 text-[color:var(--text-primary)]"
                  : "text-[color:var(--text-secondary)] hover:bg-white/5 hover:text-[color:var(--text-primary)]"
              )}
            >
              <Icon className={cn("h-4 w-4", active ? "text-[color:var(--status-info)]" : "text-[color:var(--text-ghost)] group-hover:text-[color:var(--status-info)]")} />
              <div className="min-w-0">
                <p className="font-medium truncate">{item.label}</p>
                <p className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--text-ghost)] truncate">{item.description}</p>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-white/10 px-3 py-4 space-y-1">
        {secondaryNav.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-[color:var(--status-info)]/12 text-[color:var(--text-primary)]"
                  : "text-[color:var(--text-secondary)] hover:bg-white/5 hover:text-[color:var(--text-primary)]"
              )}
            >
              <Icon className="h-4 w-4 text-[color:var(--text-ghost)]" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function DesktopSidebar() {
  return (
    <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-72 border-r border-white/10 bg-[color:var(--bg-sidebar)]">
      <NavContent />
    </aside>
  );
}

export function MobileSidebar() {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="left-4 top-4 translate-x-0 translate-y-0 w-[min(380px,calc(100vw-2rem))] max-w-none p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Navigation</DialogTitle>
        </DialogHeader>
        <NavContent mobile onNavigate={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Dashboard", icon: "dashboard" },
  { href: "/devices", label: "Devices", icon: "devices" },
  { href: "/threats", label: "Threats", icon: "warning" },
  { href: "/simulate", label: "Simulate", icon: "bolt" },
  { href: "/compliance", label: "Compliance", icon: "verified" },
  { href: "/report", label: "Report", icon: "summarize" },
];

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="top-nav-scroll" aria-label="Primary">
      <ul className="flex items-center gap-2 min-w-max">
        {navItems.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link href={item.href} className={`top-nav-item ${active ? "active" : ""}`}>
                <span className="material-symbols-outlined">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

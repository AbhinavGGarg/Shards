import {
  Activity,
  Shield,
  Radar,
  FlaskConical,
  FileCheck,
  FileBarChart,
  User,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  description?: string;
};

export const primaryNav: NavItem[] = [
  { href: "/", label: "Dashboard", icon: Activity, description: "Operational summary" },
  { href: "/devices", label: "Devices", icon: Shield, description: "Asset inventory" },
  { href: "/threats", label: "Threats", icon: Radar, description: "Live detections" },
  { href: "/simulate", label: "Simulate", icon: FlaskConical, description: "Attack simulation" },
  { href: "/compliance", label: "Compliance", icon: FileCheck, description: "Control posture" },
  { href: "/reports", label: "Reports", icon: FileBarChart, description: "Generated artifacts" },
];

export const secondaryNav: NavItem[] = [
  { href: "/account", label: "Profile", icon: User, description: "Account & access" },
  { href: "/settings", label: "Settings", icon: Settings, description: "Workspace preferences" },
];

export const pageTitles: Record<string, string> = {
  "/": "Security Dashboard",
  "/devices": "Device Inventory",
  "/threats": "Threat Operations",
  "/simulate": "Attack Simulation",
  "/compliance": "Compliance Center",
  "/reports": "Reports Studio",
  "/report": "Reports Studio",
  "/settings": "Workspace Settings",
  "/account": "Account",
};

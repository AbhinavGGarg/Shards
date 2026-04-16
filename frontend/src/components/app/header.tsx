"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Bell, LogOut, Rocket, ScanLine, Search, Settings2, UserCircle2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "@/lib/api";
import { clearSession, readSession } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MobileSidebar } from "./sidebar";
import { pageTitles } from "./navigation";

type NotificationItem = {
  id: string;
  title: string;
  detail: string;
  time: string;
  read: boolean;
};

type HeaderSettings = {
  workspaceName: string;
  timezone: string;
  criticalEmail: boolean;
  dailyDigest: boolean;
  slackWebhook: boolean;
};

const SETTINGS_KEY = "shards-header-settings-v1";

type ActionDef = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => Promise<void> | void;
};

function contextActionForPath(pathname: string): ActionDef {
  if (pathname === "/dashboard") {
    return {
      label: "Run Scan",
      icon: ScanLine,
      onClick: async () => {
        await api.triggerScan();
      },
    };
  }

  if (pathname.startsWith("/reports") || pathname === "/report") {
    return {
      label: "Open Generator",
      icon: Rocket,
      onClick: () => {
        window.location.hash = "#generate";
      },
    };
  }

  return {
    label: "Refresh",
    icon: ScanLine,
    onClick: () => window.location.reload(),
  };
}

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();

  const [environment, setEnvironment] = React.useState("production");
  const [search, setSearch] = React.useState("");
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [operatorTag, setOperatorTag] = React.useState("SH");

  const [settings, setSettings] = React.useState<HeaderSettings>({
    workspaceName: "Shards SOC",
    timezone: "America/Los_Angeles",
    criticalEmail: true,
    dailyDigest: true,
    slackWebhook: false,
  });
  const [draftSettings, setDraftSettings] = React.useState<HeaderSettings>(settings);

  const [notifications, setNotifications] = React.useState<NotificationItem[]>([
    {
      id: "n1",
      title: "Threat engine synced",
      detail: "Signatures updated successfully.",
      time: "2m ago",
      read: false,
    },
    {
      id: "n2",
      title: "Report generated",
      detail: "Executive summary PDF is available.",
      time: "18m ago",
      read: false,
    },
    {
      id: "n3",
      title: "Compliance scan",
      detail: "New controls imported from latest framework.",
      time: "1h ago",
      read: true,
    },
  ]);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as HeaderSettings;
      setSettings(parsed);
      setDraftSettings(parsed);
    } catch {
      // ignore invalid storage
    }
  }, []);

  React.useEffect(() => {
    const session = readSession();
    if (!session?.name) return;
    const initials = session.name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
    if (initials) setOperatorTag(initials);
  }, []);

  React.useEffect(() => {
    if (!settingsOpen) return;
    setDraftSettings(settings);
  }, [settings, settingsOpen]);

  React.useEffect(() => {
    if (!statusMessage) return;
    const timer = setTimeout(() => setStatusMessage(null), 2600);
    return () => clearTimeout(timer);
  }, [statusMessage]);

  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const pageTitle = pageTitles[pathname] ?? "Shards Platform";
  const showBackToDashboard = pathname !== "/dashboard";
  const action = React.useMemo(() => contextActionForPath(pathname), [pathname]);

  const runPrimaryAction = React.useCallback(async () => {
    try {
      setActionLoading(true);
      await action.onClick();
      setStatusMessage(`${action.label} completed`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Action failed";
      setStatusMessage(message);
    } finally {
      setActionLoading(false);
    }
  }, [action]);

  const saveSettings = React.useCallback(() => {
    setSettings(draftSettings);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(draftSettings));
    setSettingsOpen(false);
    setStatusMessage("Settings saved");
  }, [draftSettings]);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[color:var(--bg-sidebar)]/95 backdrop-blur">
        <div className="flex h-16 items-center gap-3 px-4 lg:px-6">
          <MobileSidebar />

          <div className="min-w-0 flex items-center gap-2">
            {showBackToDashboard && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/dashboard")}
                aria-label="Back to dashboard"
                className="inline-flex"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Button>
            )}

            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold lg:text-lg">{pageTitle}</h1>
              <p className="hidden text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-ghost)] md:block">
                {settings.workspaceName} · cyber operations workspace
              </p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden min-w-[280px] items-center gap-2 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--bg-panel)] px-3 py-2 md:flex lg:min-w-[340px]">
              <Search className="h-4 w-4 text-[color:var(--text-ghost)]" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search devices, alerts, CVEs..."
                className="h-auto border-none bg-transparent p-0 shadow-none focus-visible:ring-0"
              />
            </div>

            <div className="hidden min-w-[170px] lg:block">
              <Select value={environment} onValueChange={setEnvironment}>
                <SelectTrigger>
                  <SelectValue placeholder="Environment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="production">Production</SelectItem>
                  <SelectItem value="staging">Staging</SelectItem>
                  <SelectItem value="sandbox">Sandbox</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={() => void runPrimaryAction()} disabled={actionLoading}>
              <action.icon className="h-4 w-4" />
              {actionLoading ? "Working..." : action.label}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon" className="relative" aria-label="Notifications">
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[color:var(--status-critical)]" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[320px]">
                <DropdownMenuLabel className="flex items-center justify-between">
                  Notifications
                  <Badge variant={unreadCount > 0 ? "critical" : "muted"}>{unreadCount} unread</Badge>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length === 0 && (
                  <div className="px-2 py-3 text-sm text-[color:var(--text-ghost)]">No notifications</div>
                )}
                {notifications.map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    className="flex-col items-start gap-1"
                    onSelect={() => {
                      setNotifications((prev) =>
                        prev.map((item) => (item.id === notification.id ? { ...item, read: true } : item))
                      );
                    }}
                  >
                    <div className="flex w-full items-center justify-between gap-3">
                      <p className="font-medium">{notification.title}</p>
                      {!notification.read && <span className="h-2 w-2 rounded-full bg-[color:var(--status-info)]" />}
                    </div>
                    <p className="text-xs text-[color:var(--text-secondary)]">{notification.detail}</p>
                    <p className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--text-ghost)]">{notification.time}</p>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
                    setStatusMessage("Notifications marked as read");
                  }}
                >
                  Mark all as read
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    setNotifications([]);
                    setStatusMessage("Notifications cleared");
                  }}
                >
                  Clear all
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="secondary" size="icon" onClick={() => setSettingsOpen(true)} aria-label="Open settings">
              <Settings2 className="h-4 w-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" className="gap-2" aria-label="Profile menu">
                  <UserCircle2 className="h-4 w-4" />
                  {operatorTag}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => router.push("/account")}>View profile</DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    setSettingsOpen(true);
                    setStatusMessage("Opened workspace settings");
                  }}
                >
                  Preferences
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    clearSession();
                    setStatusMessage("Signed out");
                    router.push("/auth");
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Workspace settings</DialogTitle>
            <DialogDescription>
              Manage notification preferences, security defaults, and environment behavior.
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="general" className="w-full">
            <TabsList>
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="workspace-name">Workspace name</Label>
                <Input
                  id="workspace-name"
                  value={draftSettings.workspaceName}
                  onChange={(event) => setDraftSettings((prev) => ({ ...prev, workspaceName: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  value={draftSettings.timezone}
                  onChange={(event) => setDraftSettings((prev) => ({ ...prev, timezone: event.target.value }))}
                />
              </div>
            </TabsContent>

            <TabsContent value="security" className="space-y-4">
              <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--bg-panel)] p-4 text-sm text-[color:var(--text-secondary)]">
                MFA is enabled. Session timeout: 30 minutes. Endpoint quarantine mode: automatic.
              </div>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draftSettings.criticalEmail}
                  onChange={(event) =>
                    setDraftSettings((prev) => ({ ...prev, criticalEmail: event.target.checked }))
                  }
                  className="accent-[color:var(--status-info)]"
                />
                Critical alerts via email
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draftSettings.dailyDigest}
                  onChange={(event) => setDraftSettings((prev) => ({ ...prev, dailyDigest: event.target.checked }))}
                  className="accent-[color:var(--status-info)]"
                />
                Daily summary digest
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draftSettings.slackWebhook}
                  onChange={(event) => setDraftSettings((prev) => ({ ...prev, slackWebhook: event.target.checked }))}
                  className="accent-[color:var(--status-info)]"
                />
                Slack webhook integration
              </label>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setSettingsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveSettings}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AnimatePresence>
        {statusMessage && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="fixed right-5 top-[74px] z-50 rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--bg-card)] px-3 py-2 text-sm text-[color:var(--text-primary)]"
          >
            {statusMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

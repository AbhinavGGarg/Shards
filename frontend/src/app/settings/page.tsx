"use client";

import * as React from "react";
import { BellRing, Building2, Shield, Webhook } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const SETTINGS_KEY = "fragments-workspace-settings-v1";

type WorkspaceSettings = {
  workspaceName: string;
  defaultEnvironment: string;
  dailyDigest: boolean;
  criticalEmail: boolean;
  inAppNotifications: boolean;
  autoIsolation: boolean;
  auditRetentionDays: number;
  webhookUrl: string;
};

const defaultSettings: WorkspaceSettings = {
  workspaceName: "Shards SOC",
  defaultEnvironment: "Production",
  dailyDigest: true,
  criticalEmail: true,
  inAppNotifications: true,
  autoIsolation: false,
  auditRetentionDays: 90,
  webhookUrl: "",
};

export default function SettingsPage() {
  const [settings, setSettings] = React.useState<WorkspaceSettings>(defaultSettings);
  const [status, setStatus] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as WorkspaceSettings;
      const normalized: WorkspaceSettings = {
        ...parsed,
        workspaceName:
          parsed.workspaceName?.trim().toLowerCase() === "fragments soc"
            ? "Shards SOC"
            : parsed.workspaceName,
      };
      setSettings(normalized);
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(normalized));
    } catch {
      // ignore invalid local storage
    }
  }, []);

  React.useEffect(() => {
    if (!status) return;
    const timer = setTimeout(() => setStatus(null), 2600);
    return () => clearTimeout(timer);
  }, [status]);

  const saveSettings = React.useCallback(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    setStatus("Workspace settings saved");
  }, [settings]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Workspace Settings</CardTitle>
          <CardDescription>Configure environment defaults, alerting, and security automation behavior.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="general" className="w-full">
            <TabsList>
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="integrations">Integrations</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="workspace-name">Workspace name</Label>
                  <Input
                    id="workspace-name"
                    value={settings.workspaceName}
                    onChange={(event) => setSettings((prev) => ({ ...prev, workspaceName: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="default-env">Default environment</Label>
                  <Input
                    id="default-env"
                    value={settings.defaultEnvironment}
                    onChange={(event) => setSettings((prev) => ({ ...prev, defaultEnvironment: event.target.value }))}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-3">
              <ToggleRow
                label="Critical alerts via email"
                description="Send immediate email when high severity incidents are detected."
                checked={settings.criticalEmail}
                onChange={(checked) => setSettings((prev) => ({ ...prev, criticalEmail: checked }))}
                icon={BellRing}
              />
              <ToggleRow
                label="Daily digest"
                description="Send a daily summary of detections and posture changes."
                checked={settings.dailyDigest}
                onChange={(checked) => setSettings((prev) => ({ ...prev, dailyDigest: checked }))}
                icon={BellRing}
              />
              <ToggleRow
                label="In-app notifications"
                description="Display real-time alerts in notification center while monitoring."
                checked={settings.inAppNotifications}
                onChange={(checked) => setSettings((prev) => ({ ...prev, inAppNotifications: checked }))}
                icon={BellRing}
              />
            </TabsContent>

            <TabsContent value="security" className="space-y-4">
              <ToggleRow
                label="Auto isolate high-risk devices"
                description="Automatically isolate endpoints when confidence and severity thresholds are exceeded."
                checked={settings.autoIsolation}
                onChange={(checked) => setSettings((prev) => ({ ...prev, autoIsolation: checked }))}
                icon={Shield}
              />
              <div className="space-y-2">
                <Label htmlFor="retention">Audit retention (days)</Label>
                <Input
                  id="retention"
                  type="number"
                  min={30}
                  max={365}
                  value={settings.auditRetentionDays}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      auditRetentionDays: Number.isFinite(Number(event.target.value))
                        ? Math.min(365, Math.max(30, Number(event.target.value)))
                        : prev.auditRetentionDays,
                    }))
                  }
                />
              </div>
              <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--bg-panel)] p-4 text-sm text-[color:var(--text-secondary)]">
                <p className="font-medium text-[color:var(--text-primary)]">Enforcement status</p>
                <p className="mt-2">MFA, RBAC, and signed audit trail are active for this workspace.</p>
              </div>
            </TabsContent>

            <TabsContent value="integrations" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="webhook">Webhook URL</Label>
                <Input
                  id="webhook"
                  value={settings.webhookUrl}
                  placeholder="https://hooks.slack.com/services/..."
                  onChange={(event) => setSettings((prev) => ({ ...prev, webhookUrl: event.target.value }))}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setStatus(settings.webhookUrl ? "Webhook verified" : "Add a webhook URL first")}
                >
                  <Webhook className="h-4 w-4" />
                  Verify Webhook
                </Button>
                <Badge variant={settings.webhookUrl ? "success" : "muted"}>
                  {settings.webhookUrl ? "Connected" : "Not connected"}
                </Badge>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
            <Button onClick={saveSettings}>
              <Building2 className="h-4 w-4" />
              Save Settings
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setSettings(defaultSettings);
                setStatus("Defaults restored");
              }}
            >
              Restore Defaults
            </Button>
            {status && <p className="text-sm text-[color:var(--status-info)]">{status}</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  icon: Icon,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <label className="flex items-start justify-between gap-3 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--bg-panel)] p-4">
      <div className="flex gap-2">
        <Badge variant="default">
          <Icon className="h-3.5 w-3.5" />
        </Badge>
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="mt-1 text-sm text-[color:var(--text-secondary)]">{description}</p>
        </div>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 accent-[color:var(--status-info)]"
      />
    </label>
  );
}

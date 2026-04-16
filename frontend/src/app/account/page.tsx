"use client";

import * as React from "react";
import { Eye, EyeOff, KeyRound, ShieldCheck, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PROFILE_KEY = "fragments-account-profile-v1";

type AccountProfile = {
  name: string;
  email: string;
  role: "owner" | "analyst" | "viewer";
  timezone: string;
};

type Session = {
  id: string;
  device: string;
  location: string;
  active: boolean;
};

export default function AccountPage() {
  const [profile, setProfile] = React.useState<AccountProfile>({
    name: "Abhinav Garg",
    email: "analyst@shards.local",
    role: "owner",
    timezone: "America/Los_Angeles",
  });
  const [sessions, setSessions] = React.useState<Session[]>([
    { id: "s1", device: "MacBook Pro · Chrome", location: "San Francisco, US", active: true },
    { id: "s2", device: "iPhone · Safari", location: "San Francisco, US", active: false },
  ]);
  const [apiToken, setApiToken] = React.useState("frag_live_9skL9x2P7R48TnQe");
  const [showToken, setShowToken] = React.useState(false);
  const [status, setStatus] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(PROFILE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as AccountProfile;
      setProfile(parsed);
    } catch {
      // ignore invalid local data
    }
  }, []);

  React.useEffect(() => {
    if (!status) return;
    const timer = setTimeout(() => setStatus(null), 2500);
    return () => clearTimeout(timer);
  }, [status]);

  const saveProfile = React.useCallback(() => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    setStatus("Profile updated");
  }, [profile]);

  const regenerateToken = React.useCallback(() => {
    const suffix = Math.random().toString(36).slice(2, 18);
    setApiToken(`frag_live_${suffix}`);
    setStatus("API token rotated");
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Account Profile</CardTitle>
            <CardDescription>Manage operator identity, role, and regional preferences.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={profile.name} onChange={(event) => setProfile((prev) => ({ ...prev, name: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={profile.email} onChange={(event) => setProfile((prev) => ({ ...prev, email: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={profile.role}
                  onValueChange={(value: AccountProfile["role"]) => setProfile((prev) => ({ ...prev, role: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Workspace owner</SelectItem>
                    <SelectItem value="analyst">Security analyst</SelectItem>
                    <SelectItem value="viewer">Read-only viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  value={profile.timezone}
                  onChange={(event) => setProfile((prev) => ({ ...prev, timezone: event.target.value }))}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={saveProfile}>
                <UserRound className="h-4 w-4" />
                Save Profile
              </Button>
              <Button variant="secondary" onClick={() => setStatus("Profile sync checked")}>Check Sync</Button>
            </div>
            {status && <p className="text-sm text-[color:var(--status-info)]">{status}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Access Keys</CardTitle>
            <CardDescription>Rotate and inspect API token access used by integrations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--bg-panel)] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--text-ghost)]">Current token</p>
              <div className="mt-2 flex items-center gap-2">
                <Input
                  readOnly
                  value={showToken ? apiToken : "•".repeat(Math.max(apiToken.length, 18))}
                  className="font-mono text-xs"
                />
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={() => setShowToken((prev) => !prev)}
                  aria-label={showToken ? "Hide token" : "Show token"}
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="secondary" onClick={regenerateToken}>
                <KeyRound className="h-4 w-4" />
                Rotate Token
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  navigator.clipboard
                    .writeText(apiToken)
                    .then(() => setStatus("Token copied"))
                    .catch(() => setStatus("Clipboard unavailable"))
                }
              >
                Copy
              </Button>
            </div>

            <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--bg-panel)] p-4 text-sm text-[color:var(--text-secondary)]">
              <p className="font-medium text-[color:var(--text-primary)]">Security posture</p>
              <ul className="mt-2 space-y-1">
                <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[color:var(--status-healthy)]" /> MFA enforced</li>
                <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[color:var(--status-healthy)]" /> SSO session locking enabled</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
          <CardDescription>Review and revoke active account sessions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(sessions.length > 0 ? sessions : [{ id: "empty", device: "No active sessions", location: "", active: false }]).map((session) => (
            <div
              key={session.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--bg-panel)] p-4"
            >
              <div>
                <p className="font-medium">{session.device}</p>
                <p className="text-xs text-[color:var(--text-ghost)]">{session.location || "No location"}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={session.active ? "success" : "muted"}>{session.active ? "Current" : "Idle"}</Badge>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={session.id === "empty"}
                  onClick={() => {
                    setSessions((prev) => prev.filter((item) => item.id !== session.id));
                    setStatus("Session revoked");
                  }}
                >
                  Revoke
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

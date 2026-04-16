"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Crosshair,
  Cpu,
  FileText,
  Gauge,
  Network,
  Radar,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Sparkles,
  Swords,
  Terminal,
  Waypoints,
  Zap,
} from "lucide-react";
import { useNetworkData } from "@/hooks/useNetworkData";
import { useWebSocket } from "@/hooks/useWebSocket";
import { api, type Alert, type TopologyNode } from "@/lib/api";
import NetworkGraph from "./components/NetworkGraph";
import DeviceDetailPanel from "./components/DeviceDetailPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const NOTES_KEY = "fragments-analyst-notes-v2";

function severityScore(severity: string): number {
  const normalized = severity.toLowerCase();
  if (normalized === "critical") return 4;
  if (normalized === "high") return 3;
  if (normalized === "medium") return 2;
  if (normalized === "low") return 1;
  return 0;
}

function severityVariant(severity: string): "critical" | "warning" | "success" | "default" {
  const normalized = severity.toLowerCase();
  if (normalized === "critical" || normalized === "high") return "critical";
  if (normalized === "medium") return "warning";
  if (normalized === "low") return "success";
  return "default";
}

function formatClock(iso: string | null | undefined): string {
  if (!iso) return "No scan yet";
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DashboardPage() {
  const router = useRouter();
  const { topology, devices, stats, loading, error, refresh } = useNetworkData();
  const { connected, on } = useWebSocket();

  const [alerts, setAlerts] = React.useState<Alert[]>([]);
  const [scanLoading, setScanLoading] = React.useState(false);
  const [scanProgress, setScanProgress] = React.useState(0);
  const [selectedDevice, setSelectedDevice] = React.useState<TopologyNode | null>(null);
  const [isolated, setIsolated] = React.useState<Set<string>>(new Set());
  const [blockedIps, setBlockedIps] = React.useState<Set<string>>(new Set());
  const [trustBusy, setTrustBusy] = React.useState<string | null>(null);
  const [notes, setNotes] = React.useState("");
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

  const loadAlerts = React.useCallback(async () => {
    try {
      const data = await api.getAlerts();
      setAlerts(data);
    } catch {
      setAlerts([]);
    }
  }, []);

  React.useEffect(() => {
    void loadAlerts();
  }, [loadAlerts]);

  React.useEffect(() => {
    const unsubscribers = [
      on("scan_complete", () => {
        refresh();
        loadAlerts();
        setScanLoading(false);
        setScanProgress(100);
        setStatusMessage("Scan completed and telemetry updated");
      }),
      on("alert", () => loadAlerts()),
      on("device_joined", () => refresh()),
      on("port_change", () => refresh()),
      on("device_left", () => refresh()),
    ];

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [loadAlerts, on, refresh]);

  React.useEffect(() => {
    if (!scanLoading) return;

    const interval = window.setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 92) return prev;
        return Math.min(92, prev + Math.floor(Math.random() * 9) + 4);
      });
    }, 450);

    return () => window.clearInterval(interval);
  }, [scanLoading]);

  React.useEffect(() => {
    if (!statusMessage) return;
    const timer = window.setTimeout(() => setStatusMessage(null), 2600);
    return () => window.clearTimeout(timer);
  }, [statusMessage]);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(NOTES_KEY);
      if (stored) setNotes(stored);
    } catch {
      // ignore
    }
  }, []);

  const runScan = React.useCallback(async () => {
    if (scanLoading) return;

    setScanLoading(true);
    setScanProgress(12);
    setStatusMessage("Deep scan dispatched");

    try {
      await api.triggerScan();
      await Promise.all([refresh(), loadAlerts()]);
      setScanProgress(100);
      setStatusMessage("Telemetry refreshed after scan");
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Scan failed");
      setScanLoading(false);
      setScanProgress(0);
    } finally {
      window.setTimeout(() => {
        setScanLoading(false);
        setScanProgress(0);
      }, 900);
    }
  }, [loadAlerts, refresh, scanLoading]);

  const acknowledge = React.useCallback(
    async (id: number) => {
      await api.acknowledgeAlert(id);
      await loadAlerts();
      setStatusMessage("Incident acknowledged");
    },
    [loadAlerts]
  );

  const trustDevice = React.useCallback(
    async (mac: string) => {
      setTrustBusy(mac);
      try {
        await api.trustDevice(mac);
        await refresh();
        setStatusMessage("Device marked trusted");
      } finally {
        setTrustBusy(null);
      }
    },
    [refresh]
  );

  const incidents = React.useMemo(
    () => alerts.filter((item) => !item.acknowledged).sort((a, b) => severityScore(b.severity) - severityScore(a.severity)),
    [alerts]
  );

  const incidentSpotlight = incidents[0] ?? null;

  const spotlightDevice = React.useMemo(() => {
    if (!incidentSpotlight?.device_mac) return null;
    return devices.find((device) => device.mac === incidentSpotlight.device_mac) ?? null;
  }, [devices, incidentSpotlight]);

  const suspiciousNodes = React.useMemo(
    () => new Set(alerts.map((alert) => alert.device_mac).filter(Boolean) as string[]),
    [alerts]
  );

  const topAssets = React.useMemo(
    () => [...devices].sort((a, b) => b.risk_score - a.risk_score).slice(0, 6),
    [devices]
  );

  const riskDistribution = React.useMemo(() => {
    const critical = devices.filter((device) => device.risk_score >= 75).length;
    const elevated = devices.filter((device) => device.risk_score >= 45 && device.risk_score < 75).length;
    const guarded = Math.max(devices.length - critical - elevated, 0);
    return { critical, elevated, guarded };
  }, [devices]);

  const readinessScore = React.useMemo(() => {
    const base = Math.max(0, 100 - Math.round((stats?.avg_risk_score ?? 0) * 1.25));
    const penalty = incidents.length * 4;
    return Math.max(8, Math.min(98, base - penalty));
  }, [incidents.length, stats?.avg_risk_score]);

  const threatStream = incidents.length > 0 ? incidents.slice(0, 6) : alerts.slice(0, 6);

  const commandTone = incidentSpotlight ? "incident" : "monitoring";

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#050812] text-[color:var(--text-primary)] shadow-[0_28px_80px_rgba(0,0,0,0.45)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_-10%,rgba(255,120,80,0.12),transparent_42%),radial-gradient(circle_at_85%_10%,rgba(42,216,255,0.14),transparent_38%),linear-gradient(to_bottom,rgba(255,255,255,0.02),rgba(255,255,255,0))]" />
      <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(130,160,210,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(130,160,210,0.08)_1px,transparent_1px)] [background-size:38px_38px]" />

      <div className="relative space-y-5 p-4 sm:p-6 lg:p-8">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[color:var(--text-ghost)]">
              <span className="rounded-full border border-white/15 px-3 py-1">Fragments Command Grid</span>
              <span className="rounded-full border border-white/10 px-3 py-1 text-[color:var(--status-info)]">{connected ? "Telemetry online" : "Polling mode"}</span>
              <span className="rounded-full border border-white/10 px-3 py-1 text-[color:var(--status-warning)]">{formatClock(stats?.last_scan)}</span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {commandTone === "incident" ? "Mission Control: Active Containment" : "Mission Control: Network Guard"}
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-[color:var(--text-secondary)] sm:text-[15px]">
              Tactical workspace for live network defense. Prioritize incidents, execute response actions, and monitor posture changes from one continuous command surface.
            </p>
          </div>

          <div className="grid min-w-[280px] gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--text-ghost)]">Mission readiness</p>
              <div className="mt-3 flex items-center gap-3">
                <div
                  className="h-16 w-16 rounded-full"
                  style={{
                    background: `conic-gradient(rgba(42,216,255,0.95) ${readinessScore * 3.6}deg, rgba(255,255,255,0.12) 0deg)`,
                  }}
                >
                  <div className="m-[5px] flex h-[54px] w-[54px] items-center justify-center rounded-full bg-[#060b16] text-sm font-semibold">
                    {readinessScore}
                  </div>
                </div>
                <div>
                  <p className="text-xl font-semibold">{incidents.length}</p>
                  <p className="text-xs text-[color:var(--text-ghost)]">open incidents</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--text-ghost)]">Quick routes</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <GhostRoute label="Threats" icon={ShieldAlert} onClick={() => router.push("/threats")} />
                <GhostRoute label="Assets" icon={Cpu} onClick={() => router.push("/devices")} />
                <GhostRoute label="Simulate" icon={Swords} onClick={() => router.push("/simulate")} />
                <GhostRoute label="Reports" icon={FileText} onClick={() => router.push("/reports")} />
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-4 xl:grid-cols-12">
          <Panel className="xl:col-span-7">
            <PanelHeader
              icon={Crosshair}
              label="Incident Spotlight"
              title={incidentSpotlight ? incidentSpotlight.alert_type.replaceAll("_", " ") : "No active critical incidents"}
              badge={
                <Badge variant={incidentSpotlight ? severityVariant(incidentSpotlight.severity) : "success"}>
                  {incidentSpotlight ? incidentSpotlight.severity : "stable"}
                </Badge>
              }
            />
            <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
              <div className="space-y-4">
                <p className="text-sm leading-6 text-[color:var(--text-secondary)]">
                  {incidentSpotlight
                    ? incidentSpotlight.message
                    : "Threat engine reports nominal behavior. Continue active scanning to sustain baseline confidence."}
                </p>

                <div className="flex flex-wrap gap-2">
                  <Chip label={spotlightDevice?.hostname || spotlightDevice?.ip || "unknown host"} tone="info" />
                  <Chip label={spotlightDevice?.ip || "no-ip"} tone="muted" />
                  <Chip
                    label={spotlightDevice ? `risk ${Math.round(spotlightDevice.risk_score)}` : "no-risk"}
                    tone={spotlightDevice && spotlightDevice.risk_score >= 60 ? "critical" : "muted"}
                  />
                  <Chip
                    label={connected ? "live telemetry" : "fallback polling"}
                    tone={connected ? "success" : "warning"}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="danger"
                    onClick={() => {
                      if (!spotlightDevice) return;
                      setIsolated((prev) => new Set(prev).add(spotlightDevice.mac));
                      setStatusMessage(`Isolation command sent to ${spotlightDevice.ip}`);
                    }}
                    disabled={!spotlightDevice}
                  >
                    {spotlightDevice && isolated.has(spotlightDevice.mac) ? (
                      <ShieldCheck className="h-4 w-4" />
                    ) : (
                      <ShieldOff className="h-4 w-4" />
                    )}
                    {spotlightDevice && isolated.has(spotlightDevice.mac) ? "Device isolated" : "Isolate device"}
                  </Button>

                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (!spotlightDevice) return;
                      setBlockedIps((prev) => new Set(prev).add(spotlightDevice.ip));
                      setStatusMessage(`Blocked ${spotlightDevice.ip}`);
                    }}
                    disabled={!spotlightDevice}
                  >
                    <Terminal className="h-4 w-4" />
                    {spotlightDevice && blockedIps.has(spotlightDevice.ip) ? "IP blocked" : "Block IP"}
                  </Button>

                  <Button onClick={() => void runScan()} disabled={scanLoading}>
                    <Radar className="h-4 w-4" />
                    {scanLoading ? "Scanning..." : "Run deep scan"}
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={() => {
                      if (!incidentSpotlight) return;
                      void acknowledge(incidentSpotlight.id);
                    }}
                    disabled={!incidentSpotlight}
                  >
                    Acknowledge
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#080f1d] p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--text-ghost)]">Containment path</p>
                <div className="mt-3 space-y-2 text-sm">
                  <PathRow label="Entry" value={incidentSpotlight?.device_mac || "N/A"} />
                  <PathRow label="Lateral" value={spotlightDevice?.hostname || "none"} />
                  <PathRow label="Target" value={spotlightDevice?.ip || "none"} />
                </div>
                <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.02] p-3 text-xs text-[color:var(--text-secondary)]">
                  Confidence {incidentSpotlight ? Math.min(97, 62 + severityScore(incidentSpotlight.severity) * 8) : 42}%
                </div>
              </div>
            </div>
          </Panel>

          <Panel className="xl:col-span-3">
            <PanelHeader
              icon={Activity}
              label="Threat Stream"
              title="Live event queue"
              badge={<Badge variant={incidents.length > 0 ? "critical" : "success"}>{threatStream.length}</Badge>}
            />
            <div className="mt-3 space-y-2">
              {threatStream.length === 0 && (
                <p className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-sm text-[color:var(--text-secondary)]">
                  No recent alerts. Monitoring remains stable.
                </p>
              )}
              <AnimatePresence>
                {threatStream.map((alert) => (
                  <motion.button
                    key={alert.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    onClick={() => {
                      const node = topology?.nodes.find((item) => item.id === alert.device_mac);
                      if (node) setSelectedDevice(node);
                    }}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.02] p-3 text-left transition-colors hover:border-[color:var(--status-info)]/35 hover:bg-white/[0.04]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant={severityVariant(alert.severity)}>{alert.severity}</Badge>
                      <span className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--text-ghost)]">
                        {new Date(alert.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-[color:var(--text-secondary)]">{alert.message}</p>
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          </Panel>

          <Panel className="xl:col-span-2">
            <PanelHeader icon={Zap} label="Response Dock" title="Action rail" />
            <div className="mt-3 space-y-2">
              <ActionDockButton
                icon={Radar}
                label={scanLoading ? "Scan in progress" : "Launch scan"}
                onClick={() => void runScan()}
                tone="info"
              />
              <ActionDockButton
                icon={Swords}
                label="Run simulation"
                onClick={() => router.push("/simulate")}
                tone="warning"
              />
              <ActionDockButton
                icon={FileText}
                label="Generate report"
                onClick={() => router.push("/reports#generate")}
                tone="neutral"
              />
              <ActionDockButton
                icon={ShieldAlert}
                label="Threat console"
                onClick={() => router.push("/threats")}
                tone="critical"
              />
            </div>
          </Panel>

          <Panel className="xl:col-span-4">
            <PanelHeader icon={ShieldAlert} label="Vulnerable Assets" title="Priority hardening queue" />
            <div className="mt-3 space-y-2">
              {(topAssets.length > 0
                ? topAssets
                : [
                    {
                      mac: "empty",
                      hostname: "No assets discovered",
                      ip: "Run scan to populate",
                      risk_score: 0,
                      is_trusted: false,
                      open_ports: {},
                    },
                  ]
              ).map((asset) => (
                <div key={asset.mac} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{asset.hostname || asset.ip}</p>
                      <p className="text-xs text-[color:var(--text-ghost)]">{asset.ip}</p>
                    </div>
                    <Badge variant={asset.risk_score >= 70 ? "critical" : asset.risk_score >= 45 ? "warning" : "success"}>
                      {Math.round(asset.risk_score)}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge variant="muted">{Object.keys(asset.open_ports || {}).length} ports</Badge>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={asset.mac === "empty" || trustBusy === asset.mac || asset.is_trusted}
                      onClick={() => void trustDevice(asset.mac)}
                    >
                      {trustBusy === asset.mac ? "Saving..." : asset.is_trusted ? "Trusted" : "Trust"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const node = topology?.nodes.find((item) => item.id === asset.mac || item.ip === asset.ip);
                        if (node) setSelectedDevice(node);
                      }}
                      disabled={asset.mac === "empty"}
                    >
                      Inspect
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="xl:col-span-3">
            <PanelHeader icon={Gauge} label="Posture Summary" title="Risk distribution" />
            <div className="mt-4 space-y-3">
              <RiskBar label="Critical exposure" value={riskDistribution.critical} total={Math.max(devices.length, 1)} tone="critical" />
              <RiskBar label="Elevated risk" value={riskDistribution.elevated} total={Math.max(devices.length, 1)} tone="warning" />
              <RiskBar label="Guarded assets" value={riskDistribution.guarded} total={Math.max(devices.length, 1)} tone="success" />
            </div>
            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-sm text-[color:var(--text-secondary)]">
              Current posture is <span className="font-medium text-white">{readinessScore >= 80 ? "controlled" : readinessScore >= 60 ? "watchlist" : "critical"}</span> with {incidents.length} open items requiring analyst validation.
            </div>
          </Panel>

          <Panel className="xl:col-span-5">
            <PanelHeader icon={Bot} label="Analyst Co-Pilot" title="Operational recommendations" />
            <div className="mt-3 space-y-3">
              <BriefPoint
                icon={Sparkles}
                text={
                  incidentSpotlight
                    ? "Correlated detections indicate abnormal service exposure and potential lateral movement corridor."
                    : "No immediate compromise pattern detected. Continue scheduled scan cadence to preserve baseline confidence."
                }
              />
              <BriefPoint
                icon={Waypoints}
                text={`Prioritize ${topAssets.filter((item) => item.risk_score >= 45).length} elevated assets with open remote-management ports for rapid hardening.`}
              />
              <BriefPoint
                icon={Clock3}
                text={`Last scan ${formatClock(stats?.last_scan)}. ${connected ? "Streaming telemetry is active." : "Realtime stream unavailable; polling fallback enabled."}`}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => router.push("/reports#generate")}>
                <FileText className="h-4 w-4" />
                Executive brief
              </Button>
              <Button variant="secondary" onClick={() => router.push("/compliance")}>
                <ShieldCheck className="h-4 w-4" />
                Compliance posture
              </Button>
            </div>
          </Panel>

          <Panel className="xl:col-span-8">
            <PanelHeader
              icon={Network}
              label="Topology Context"
              title="Network map in tactical context"
              badge={<Badge variant={connected ? "success" : "warning"}>{connected ? "live" : "degraded"}</Badge>}
            />
            <div className="mt-3">
              <NetworkGraph
                data={topology}
                mode={incidents.length > 0 ? "incident" : "normal"}
                suspiciousNodes={suspiciousNodes}
                attackLinkKeys={new Set<string>()}
                onNodeHover={() => null}
                onNodeClick={(node) => setSelectedDevice(node)}
                height={300}
              />
            </div>
          </Panel>

          <Panel className="xl:col-span-4">
            <PanelHeader icon={Radar} label="Scan Telemetry" title="Execution + notes" />
            <div className="mt-3 space-y-4">
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[color:var(--text-secondary)]">Scan state</span>
                  <span className="font-medium">{scanLoading ? "Executing" : "Idle"}</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full bg-[color:var(--status-info)]"
                    animate={{ width: `${scanProgress}%` }}
                    transition={{ duration: 0.35 }}
                  />
                </div>
                <p className="mt-2 text-xs text-[color:var(--text-ghost)]">
                  {scanLoading ? `${scanProgress}% complete` : "Awaiting next command"}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.14em] text-[color:var(--text-ghost)]">Analyst notes</label>
                <Textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Capture findings, hypotheses, and handoff notes..."
                  className="min-h-[140px] bg-[#080f1d]"
                />
                <Button
                  variant="secondary"
                  onClick={() => {
                    localStorage.setItem(NOTES_KEY, notes);
                    setStatusMessage("Notes saved locally");
                  }}
                >
                  Save notes
                </Button>
              </div>
            </div>
          </Panel>
        </div>

        <AnimatePresence>
          {statusMessage && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="fixed bottom-5 right-5 z-50 rounded-lg border border-white/15 bg-[#081122] px-3 py-2 text-sm text-[color:var(--text-primary)]"
            >
              {statusMessage}
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="rounded-xl border border-[color:var(--status-critical)]/35 bg-[color:var(--status-critical)]/12 px-4 py-3 text-sm text-[color:var(--status-critical)]">
            {error}
          </div>
        )}

        {loading && (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-[color:var(--text-ghost)]">
            Synchronizing telemetry...
          </div>
        )}
      </div>

      {selectedDevice && (
        <div className="fixed bottom-0 right-0 top-8 z-[60] shadow-2xl">
          <DeviceDetailPanel device={selectedDevice} onClose={() => setSelectedDevice(null)} />
        </div>
      )}
    </div>
  );
}

function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24 }}
      className={`rounded-2xl border border-white/10 bg-[linear-gradient(160deg,rgba(12,20,34,0.92),rgba(8,13,24,0.94))] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.35)] ${className ?? ""}`}
    >
      {children}
    </motion.section>
  );
}

function PanelHeader({
  icon: Icon,
  label,
  title,
  badge,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  title: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-ghost)]">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </div>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-white">{title}</h2>
      </div>
      {badge}
    </div>
  );
}

function GhostRoute({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.02] px-2 py-1.5 text-xs text-[color:var(--text-secondary)] transition-colors hover:border-[color:var(--status-info)]/35 hover:text-white"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function ActionDockButton({
  icon: Icon,
  label,
  onClick,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  tone: "info" | "warning" | "critical" | "neutral";
}) {
  const toneClass =
    tone === "critical"
      ? "border-[color:var(--status-critical)]/40 text-[color:var(--status-critical)]"
      : tone === "warning"
        ? "border-[color:var(--status-warning)]/40 text-[color:var(--status-warning)]"
        : tone === "info"
          ? "border-[color:var(--status-info)]/40 text-[color:var(--status-info)]"
          : "border-white/20 text-[color:var(--text-secondary)]";

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-xl border bg-white/[0.02] px-3 py-2 text-sm transition-colors hover:bg-white/[0.04] ${toneClass}`}
    >
      <span className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        {label}
      </span>
      <ArrowRight className="h-3.5 w-3.5" />
    </button>
  );
}

function RiskBar({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: "critical" | "warning" | "success";
}) {
  const width = `${Math.max(7, Math.round((value / total) * 100))}%`;
  const barColor =
    tone === "critical"
      ? "bg-[color:var(--status-critical)]"
      : tone === "warning"
        ? "bg-[color:var(--status-warning)]"
        : "bg-[color:var(--status-healthy)]";

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-[color:var(--text-secondary)]">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-2 rounded-full bg-white/10">
        <div className={`h-full rounded-full ${barColor}`} style={{ width }} />
      </div>
    </div>
  );
}

function BriefPoint({
  icon: Icon,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
}) {
  return (
    <div className="flex gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-sm text-[color:var(--text-secondary)]">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--status-info)]" />
      <p>{text}</p>
    </div>
  );
}

function Chip({ label, tone }: { label: string; tone: "info" | "critical" | "success" | "warning" | "muted" }) {
  const className =
    tone === "critical"
      ? "border-[color:var(--status-critical)]/35 text-[color:var(--status-critical)]"
      : tone === "warning"
        ? "border-[color:var(--status-warning)]/35 text-[color:var(--status-warning)]"
        : tone === "success"
          ? "border-[color:var(--status-healthy)]/35 text-[color:var(--status-healthy)]"
          : tone === "info"
            ? "border-[color:var(--status-info)]/35 text-[color:var(--status-info)]"
            : "border-white/15 text-[color:var(--text-secondary)]";

  return <span className={`rounded-full border px-2.5 py-1 text-xs uppercase tracking-[0.12em] ${className}`}>{label}</span>;
}

function PathRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
      <span className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-ghost)]">{label}</span>
      <span className="max-w-[170px] truncate text-xs text-[color:var(--text-secondary)]">{value}</span>
    </div>
  );
}

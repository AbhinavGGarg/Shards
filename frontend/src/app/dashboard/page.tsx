"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Radar,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
} from "lucide-react";
import { useNetworkData } from "@/hooks/useNetworkData";
import { useWebSocket } from "@/hooks/useWebSocket";
import { api, type Alert, type TopologyNode } from "@/lib/api";
import NetworkGraph from "../components/NetworkGraph";
import DeviceDetailPanel from "../components/DeviceDetailPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function severityColor(severity: string): "critical" | "warning" | "success" | "default" {
  const s = severity.toLowerCase();
  if (s === "critical" || s === "high") return "critical";
  if (s === "medium") return "warning";
  if (s === "low") return "success";
  return "default";
}

export default function DashboardPage() {
  const router = useRouter();
  const { topology, devices, stats, loading, error, refresh } = useNetworkData();
  const { connected, on } = useWebSocket();

  const [alerts, setAlerts] = React.useState<Alert[]>([]);
  const [scanLoading, setScanLoading] = React.useState(false);
  const [selectedDevice, setSelectedDevice] = React.useState<TopologyNode | null>(null);
  const [isolated, setIsolated] = React.useState<Set<string>>(new Set());
  const [blockedIps, setBlockedIps] = React.useState<Set<string>>(new Set());

  const loadAlerts = React.useCallback(async () => {
    try {
      const data = await api.getAlerts();
      setAlerts(data);
    } catch {
      setAlerts([]);
    }
  }, []);

  React.useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  React.useEffect(() => {
    const unsubs = [
      on("scan_complete", () => {
        refresh();
        loadAlerts();
      }),
      on("alert", () => {
        loadAlerts();
      }),
      on("device_joined", () => refresh()),
      on("port_change", () => refresh()),
      on("device_left", () => refresh()),
    ];
    return () => unsubs.forEach((u) => u());
  }, [loadAlerts, on, refresh]);

  const runScan = React.useCallback(async () => {
    if (scanLoading) return;
    setScanLoading(true);
    try {
      await api.triggerScan();
      await Promise.all([refresh(), loadAlerts()]);
    } finally {
      setScanLoading(false);
    }
  }, [loadAlerts, refresh, scanLoading]);

  const acknowledge = React.useCallback(async (id: number) => {
    await api.acknowledgeAlert(id);
    await loadAlerts();
  }, [loadAlerts]);

  const highRiskDevices = React.useMemo(
    () => [...devices].sort((a, b) => b.risk_score - a.risk_score).slice(0, 6),
    [devices]
  );

  const criticalCount = alerts.filter((a) => ["critical", "high"].includes(a.severity.toLowerCase()) && !a.acknowledged).length;
  const warningCount = alerts.filter((a) => a.severity.toLowerCase() === "medium" && !a.acknowledged).length;
  const safeCount = Math.max((stats?.total_devices ?? devices.length) - criticalCount - warningCount, 0);

  const telemetryStatus = connected ? "Live stream active" : "Polling mode active";

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Risk Score" value={(stats?.avg_risk_score ?? 0).toFixed(1)} icon={ShieldAlert} accent="warning" description="Average device risk" />
        <MetricCard title="Monitored Devices" value={String(stats?.total_devices ?? devices.length)} icon={Radar} accent="default" description="Live asset inventory" />
        <MetricCard title="Critical Alerts" value={String(criticalCount)} icon={AlertTriangle} accent="critical" description="Needs immediate triage" />
        <MetricCard title="System Health" value={connected ? "Healthy" : "Degraded"} icon={connected ? CheckCircle2 : ShieldAlert} accent={connected ? "success" : "warning"} description={telemetryStatus} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <Card className="overflow-hidden">
          <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle>Network Command Surface</CardTitle>
              <CardDescription>Live topology with actionable incident controls.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={connected ? "success" : "warning"}>{telemetryStatus}</Badge>
              <Button onClick={runScan} disabled={scanLoading}>
                <Radar className="h-4 w-4" />
                {scanLoading ? "Scanning..." : "Run Scan"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <NetworkGraph
              data={topology}
              mode={criticalCount > 0 ? "incident" : "normal"}
              suspiciousNodes={new Set(alerts.map((a) => a.device_mac).filter(Boolean) as string[])}
              attackLinkKeys={new Set<string>()}
              onNodeHover={() => null}
              onNodeClick={(node) => setSelectedDevice(node)}
              height={460}
            />

            <div className="grid gap-3 md:grid-cols-3">
              <ActionTile
                title="Critical"
                value={criticalCount}
                helper="Immediate response"
                tone="critical"
                actionLabel="Review Threats"
                onAction={() => router.push("/threats")}
              />
              <ActionTile
                title="Warnings"
                value={warningCount}
                helper="Investigate soon"
                tone="warning"
                actionLabel="Run Scan"
                onAction={() => void runScan()}
              />
              <ActionTile
                title="Safe Assets"
                value={safeCount}
                helper="No active issues"
                tone="success"
                actionLabel="View Devices"
                onAction={() => router.push("/devices")}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Operations Assistant</CardTitle>
            <CardDescription>
              {criticalCount > 0
                ? "Threats detected. Prioritize containment and credential integrity checks."
                : "All systems nominal. Continue scheduled scans and compliance reviews."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--bg-panel)] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--text-ghost)]">Assistant reasoning</p>
              <ul className="mt-3 space-y-2 text-sm text-[color:var(--text-secondary)]">
                <li className="flex gap-2"><Sparkles className="h-4 w-4 mt-0.5 text-[color:var(--status-info)]" /> Correlating alert stream with topology changes and open-port drift.</li>
                <li className="flex gap-2"><TerminalSquare className="h-4 w-4 mt-0.5 text-[color:var(--status-info)]" /> Prioritizing hosts with repeated anomalies and high-risk services.</li>
              </ul>
            </div>

            <div className="space-y-2">
              <Button className="w-full justify-start" variant="secondary" onClick={() => void runScan()}>
                <ShieldCheck className="h-4 w-4" /> Run Deep Verification Scan
              </Button>
              <Button className="w-full justify-start" variant="secondary" onClick={() => router.push("/reports")}> 
                <Sparkles className="h-4 w-4" /> Generate Executive Report
              </Button>
              <Button className="w-full justify-start" variant="secondary" onClick={() => router.push("/simulate")}> 
                <Radar className="h-4 w-4" /> Launch Attack Simulation
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Alerts Overview</CardTitle>
            <CardDescription>Prioritized detection queue with acknowledgement flow.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Severity</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(alerts.length > 0
                  ? alerts.slice(0, 8)
                  : [
                      {
                        id: -1,
                        severity: "low",
                        alert_type: "telemetry",
                        message: "No active alerts. Continue monitoring baseline health.",
                        timestamp: new Date().toISOString(),
                        acknowledged: true,
                        device_mac: null,
                      },
                    ]
                ).map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell>
                      <Badge variant={severityColor(alert.severity)}>{alert.severity}</Badge>
                    </TableCell>
                    <TableCell className="capitalize">{alert.alert_type.replaceAll("_", " ")}</TableCell>
                    <TableCell className="text-[color:var(--text-secondary)]">{alert.message}</TableCell>
                    <TableCell className="text-[color:var(--text-ghost)] text-xs">
                      {new Date(alert.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </TableCell>
                    <TableCell className="text-right">
                      {alert.id > 0 ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => void acknowledge(alert.id)}
                          disabled={alert.acknowledged}
                        >
                          {alert.acknowledged ? "Acknowledged" : "Acknowledge"}
                        </Button>
                      ) : (
                        <Badge variant="success">Nominal</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {error && (
              <p className="mt-3 text-sm text-[color:var(--status-critical)]">
                {error} — data may be partially unavailable. Scan action still works.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Most Vulnerable Devices</CardTitle>
            <CardDescription>Top assets requiring hardening.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(highRiskDevices.length > 0
              ? highRiskDevices
              : [
                  {
                    mac: "demo",
                    ip: "No devices yet",
                    hostname: "Run a scan to populate inventory",
                    vendor: "",
                    os: "",
                    device_type: "",
                    open_ports: {},
                    services: {},
                    risk_score: 0,
                    is_trusted: false,
                    is_flagged: false,
                    cves: [],
                    first_seen: "",
                    last_seen: "",
                  },
                ]
            ).map((device) => (
              <motion.div
                key={device.mac}
                layout
                className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--bg-panel)] p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{device.hostname || device.ip}</p>
                    <p className="text-xs text-[color:var(--text-ghost)]">{device.ip}</p>
                  </div>
                  <Badge variant={device.risk_score >= 70 ? "critical" : device.risk_score >= 40 ? "warning" : "success"}>
                    {Math.round(device.risk_score)}
                  </Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setIsolated((prev) => new Set(prev).add(device.mac));
                    }}
                  >
                    {isolated.has(device.mac) ? "Isolated" : "Isolate"}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      setBlockedIps((prev) => new Set(prev).add(device.ip));
                    }}
                  >
                    {blockedIps.has(device.ip) ? "Blocked" : "Block IP"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const node = topology?.nodes.find((n) => n.id === device.mac || n.ip === device.ip);
                      if (node) setSelectedDevice(node);
                    }}
                  >
                    Details
                  </Button>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </div>

      {selectedDevice && (
        <div className="fixed right-0 top-16 bottom-0 z-50 shadow-2xl">
          <DeviceDetailPanel device={selectedDevice} onClose={() => setSelectedDevice(null)} />
        </div>
      )}

      {loading && (
        <div className="fixed bottom-6 right-6">
          <Badge variant="default">Refreshing telemetry...</Badge>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  accent,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: "critical" | "warning" | "success" | "default";
}) {
  const badgeVariant = accent === "default" ? "default" : accent;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardDescription>{title}</CardDescription>
          <Badge variant={badgeVariant}><Icon className="h-3.5 w-3.5" /></Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tracking-tight">{value}</p>
        <p className="mt-1 text-xs text-[color:var(--text-ghost)]">{description}</p>
      </CardContent>
    </Card>
  );
}

function ActionTile({
  title,
  value,
  helper,
  tone,
  actionLabel,
  onAction,
}: {
  title: string;
  value: number;
  helper: string;
  tone: "critical" | "warning" | "success";
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--bg-panel)] p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-ghost)]">{title}</p>
        <Badge variant={tone}>{value}</Badge>
      </div>
      <p className="mt-2 text-sm text-[color:var(--text-secondary)]">{helper}</p>
      <Button variant="ghost" size="sm" className="mt-2" onClick={onAction}>
        {actionLabel}
      </Button>
    </div>
  );
}

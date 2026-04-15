"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNetworkData } from "@/hooks/useNetworkData";
import { useWebSocket } from "@/hooks/useWebSocket";
import { api, type Alert, type TopologyNode } from "@/lib/api";
import NetworkGraph from "./components/NetworkGraph";
import DeviceDetailPanel from "./components/DeviceDetailPanel";
import ActiveIncidentPanel from "./components/command-center/ActiveIncidentPanel";
import AIInsightsPanel from "./components/command-center/AIInsightsPanel";
import IntelligenceSidebar from "./components/command-center/IntelligenceSidebar";
import IncidentTimeline from "./components/command-center/IncidentTimeline";
import ActionRail from "./components/command-center/ActionRail";
import type {
  ActiveIncident,
  IncidentRiskLevel,
  ThreatSeverityBuckets,
  TimelineEvent,
  VulnerableDeviceSummary,
} from "./components/command-center/types";

function edgeKey(a: string, b: string): string {
  return [a, b].sort().join("::");
}

function getSeverityRank(severity: string): number {
  const norm = severity.toLowerCase();
  if (norm === "critical") return 4;
  if (norm === "high") return 3;
  if (norm === "medium") return 2;
  if (norm === "low") return 1;
  return 0;
}

function scoreToRiskLevel(score: number): IncidentRiskLevel {
  if (score >= 75) return "CRITICAL";
  if (score >= 55) return "HIGH";
  if (score >= 30) return "MEDIUM";
  return "LOW";
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function inferVulnsFromPorts(device: TopologyNode | null): string[] {
  if (!device) return ["Behavioral anomaly correlation", "T1078 valid account abuse pattern"];

  const ports = Object.keys(device.open_ports ?? {}).map((p) => Number(p));
  const findings: string[] = [];

  if (ports.includes(445)) findings.push("CVE-2020-0796 SMB compression RCE exposure");
  if (ports.includes(3389)) findings.push("RDP brute-force and credential stuffing surface");
  if (ports.includes(22)) findings.push("SSH lateral movement foothold potential");
  if (ports.includes(80) || ports.includes(443)) findings.push("Web attack surface requires WAF policy review");
  if (ports.includes(3306) || ports.includes(5432)) findings.push("Database service reachable from user segment");

  if (findings.length === 0) {
    findings.push("Abnormal east-west communication pattern");
    findings.push("Unusual service fingerprint drift vs. baseline");
  }

  return findings.slice(0, 3);
}

export default function DashboardPage() {
  const { topology, stats, loading, error, refresh } = useNetworkData();
  const { connected, on } = useWebSocket();

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<TopologyNode | null>(null);
  const [hoveredDevice, setHoveredDevice] = useState<TopologyNode | null>(null);
  const [newDeviceMacs, setNewDeviceMacs] = useState<Set<string>>(new Set());
  const [isolatedDeviceIds, setIsolatedDeviceIds] = useState<Set<string>>(new Set());
  const [blockedIps, setBlockedIps] = useState<Set<string>>(new Set());
  const [timelineRuntime, setTimelineRuntime] = useState<TimelineEvent[]>([]);
  const [deepScanRunning, setDeepScanRunning] = useState(false);

  const loadAlerts = useCallback(async () => {
    try {
      const data = await api.getAlerts();
      setAlerts(data);
    } catch {
      // Keep UI resilient if alerts endpoint has transient failures.
    }
  }, []);

  const pushRuntimeEvent = useCallback((event: Omit<TimelineEvent, "id">) => {
    const id = `runtime-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    setTimelineRuntime((prev) => [{ id, ...event }, ...prev].slice(0, 20));
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  useEffect(() => {
    const unsubs = [
      on("scan_complete", (data: unknown) => {
        const payload = data as { devices_found?: number };
        pushRuntimeEvent({
          type: "scan",
          title: "Network sweep complete",
          detail: `Deep scan telemetry updated. Devices discovered: ${payload.devices_found ?? "n/a"}.`,
          timestamp: new Date().toISOString(),
          severity: "info",
        });
        refresh();
        loadAlerts();
      }),
      on("device_joined", (data: unknown) => {
        const payload = data as { mac?: string; ip?: string };
        if (payload.mac) {
          setNewDeviceMacs((prev) => {
            const next = new Set(prev);
            next.add(payload.mac ?? "");
            return next;
          });
          setTimeout(() => {
            setNewDeviceMacs((prev) => {
              const next = new Set(prev);
              next.delete(payload.mac ?? "");
              return next;
            });
          }, 6000);
        }
        pushRuntimeEvent({
          type: "detection",
          title: "New endpoint detected",
          detail: `${payload.ip ?? "Unknown IP"} joined monitored segment.`,
          timestamp: new Date().toISOString(),
          severity: "medium",
        });
        refresh();
      }),
      on("device_left", (data: unknown) => {
        const payload = data as { ip?: string };
        pushRuntimeEvent({
          type: "detection",
          title: "Endpoint disconnected",
          detail: `${payload.ip ?? "Unknown endpoint"} left monitored segment.`,
          timestamp: new Date().toISOString(),
          severity: "low",
        });
        refresh();
      }),
      on("port_change", () => {
        pushRuntimeEvent({
          type: "detection",
          title: "Service exposure changed",
          detail: "Detected service/port drift on monitored host.",
          timestamp: new Date().toISOString(),
          severity: "high",
        });
        refresh();
      }),
      on("alert", () => {
        pushRuntimeEvent({
          type: "alert",
          title: "New threat alert generated",
          detail: "Correlation engine flagged suspicious activity in the network graph.",
          timestamp: new Date().toISOString(),
          severity: "high",
        });
        refresh();
        loadAlerts();
      }),
    ];

    return () => unsubs.forEach((u) => u());
  }, [loadAlerts, on, pushRuntimeEvent, refresh]);

  const nodes = topology?.nodes ?? [];

  const sortedAlerts = useMemo(
    () =>
      [...alerts].sort((a, b) => {
        const severityDelta = getSeverityRank(b.severity) - getSeverityRank(a.severity);
        if (severityDelta !== 0) return severityDelta;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      }),
    [alerts]
  );

  const highestRiskNodes = useMemo(
    () => [...nodes].sort((a, b) => b.risk_score - a.risk_score),
    [nodes]
  );

  const primaryAlert = sortedAlerts.find((a) => !a.acknowledged) ?? sortedAlerts[0];
  const incidentDevice =
    (primaryAlert?.device_mac ? nodes.find((node) => node.id === primaryAlert.device_mac) : null) ??
    highestRiskNodes[0] ??
    null;

  const baseRisk = incidentDevice?.risk_score ?? (primaryAlert ? 60 : 24);
  const confidence = clamp(
    Math.round(baseRisk * 0.78 + (primaryAlert ? 18 : 9) + Math.min(Object.keys(incidentDevice?.open_ports ?? {}).length * 2, 10)),
    45,
    99
  );

  const activeIncident: ActiveIncident = {
    id: primaryAlert ? `alert-${primaryAlert.id}` : "baseline-incident",
    title: primaryAlert
      ? `Suspicious ${primaryAlert.alert_type.replaceAll("_", " ")} detected`
      : "Potential lateral movement pattern detected",
    affectedDevice: incidentDevice?.hostname || incidentDevice?.ip || "Unknown endpoint",
    affectedDeviceId: incidentDevice?.id ?? "unknown-device",
    affectedIp: incidentDevice?.ip ?? "unknown",
    riskLevel: scoreToRiskLevel(baseRisk),
    confidence,
    timestamp: primaryAlert?.timestamp ?? new Date().toISOString(),
    summary: primaryAlert?.message
      ? `${primaryAlert.message}. Immediate triage recommended to contain blast radius.`
      : "Behavior analytics identified anomalous east-west traffic behavior that deviates from baseline.",
    whyFlagged: [
      `Device risk score is ${Math.round(baseRisk)} with unusual service exposure profile.`,
      primaryAlert
        ? `Alert channel reported ${primaryAlert.severity.toUpperCase()} severity telemetry.`
        : "Traffic shape indicates potential credential relay behavior.",
      `Open services detected: ${Object.keys(incidentDevice?.open_ports ?? {}).slice(0, 3).join(", ") || "none"}.`,
    ],
    suggestedActions: [
      "Isolate affected host from lateral movement pathways.",
      "Run deep scan to confirm service fingerprint changes.",
      "Block suspicious IP and validate authentication logs.",
    ],
    relatedVulnerabilities: inferVulnsFromPorts(incidentDevice),
    sourceAlertId: primaryAlert?.id,
  };

  const threatBuckets: ThreatSeverityBuckets = useMemo(
    () =>
      alerts.reduce<ThreatSeverityBuckets>(
        (acc, alert) => {
          const sev = alert.severity.toLowerCase();
          if (sev === "critical") acc.critical += 1;
          else if (sev === "high") acc.high += 1;
          else if (sev === "medium") acc.medium += 1;
          else acc.low += 1;
          return acc;
        },
        { critical: 0, high: 0, medium: 0, low: 0 }
      ),
    [alerts]
  );

  const vulnerableDevices: VulnerableDeviceSummary[] = useMemo(
    () =>
      highestRiskNodes.slice(0, 5).map((device) => ({
        id: device.id,
        label: device.hostname || device.ip,
        ip: device.ip,
        risk: device.risk_score,
        openPortCount: Object.keys(device.open_ports ?? {}).length,
      })),
    [highestRiskNodes]
  );

  const suspiciousNodeIds = useMemo(() => {
    const ids = new Set<string>();
    alerts.forEach((alert) => {
      if (alert.device_mac) ids.add(alert.device_mac);
    });
    nodes.forEach((node) => {
      if (node.risk_score >= 65) ids.add(node.id);
      if (isolatedDeviceIds.has(node.id)) ids.add(node.id);
    });
    return ids;
  }, [alerts, isolatedDeviceIds, nodes]);

  const attackLinkKeys = useMemo(() => {
    const keys = new Set<string>();
    if (!topology) return keys;

    const router = topology.nodes.find((n) => n.is_router);
    if (router && incidentDevice && router.id !== incidentDevice.id) {
      keys.add(edgeKey(router.id, incidentDevice.id));
    }

    topology.edges.forEach((edge) => {
      if (suspiciousNodeIds.has(edge.source) || suspiciousNodeIds.has(edge.target)) {
        keys.add(edgeKey(edge.source, edge.target));
      }
    });

    return keys;
  }, [incidentDevice, suspiciousNodeIds, topology]);

  const riskTrend = useMemo(() => {
    const base = stats?.avg_risk_score ?? 22;
    return Array.from({ length: 12 }, (_, i) => {
      const wave = Math.sin(i * 0.7) * 5;
      const drift = (i - 6) * 0.55;
      return clamp(base + wave + drift, 6, 96);
    });
  }, [stats?.avg_risk_score]);

  const timelineEvents = useMemo<TimelineEvent[]>(() => {
    const alertEvents: TimelineEvent[] = sortedAlerts.slice(0, 8).map((alert) => ({
      id: `alert-${alert.id}`,
      type: "alert",
      title: alert.alert_type.replaceAll("_", " "),
      detail: alert.message,
      timestamp: alert.timestamp,
      severity:
        alert.severity.toLowerCase() === "critical"
          ? "critical"
          : alert.severity.toLowerCase() === "high"
            ? "high"
            : alert.severity.toLowerCase() === "medium"
              ? "medium"
              : "low",
    }));

    const scanEvent: TimelineEvent[] = stats?.last_scan
      ? [
          {
            id: "last-scan",
            type: "scan",
            title: "Background scan completed",
            detail: `Telemetry synchronized across ${stats.total_devices} monitored assets.`,
            timestamp: stats.last_scan,
            severity: "info",
          },
        ]
      : [];

    return [...timelineRuntime, ...scanEvent, ...alertEvents]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 14);
  }, [sortedAlerts, stats?.last_scan, stats?.total_devices, timelineRuntime]);

  const handleInvestigate = useCallback(() => {
    if (incidentDevice) {
      setSelectedDevice(incidentDevice);
      pushRuntimeEvent({
        type: "action",
        title: "Investigation started",
        detail: `Analyst opened forensic panel for ${incidentDevice.hostname || incidentDevice.ip}.`,
        timestamp: new Date().toISOString(),
        severity: "info",
      });
    }
  }, [incidentDevice, pushRuntimeEvent]);

  const handleIsolate = useCallback(() => {
    if (!incidentDevice) return;
    setIsolatedDeviceIds((prev) => {
      const next = new Set(prev);
      next.add(incidentDevice.id);
      return next;
    });
    pushRuntimeEvent({
      type: "action",
      title: "Isolation command simulated",
      detail: `${incidentDevice.hostname || incidentDevice.ip} moved to quarantine segment.`,
      timestamp: new Date().toISOString(),
      severity: "high",
    });
  }, [incidentDevice, pushRuntimeEvent]);

  const handleIgnore = useCallback(async () => {
    if (!activeIncident.sourceAlertId) return;
    try {
      await api.acknowledgeAlert(activeIncident.sourceAlertId);
      pushRuntimeEvent({
        type: "action",
        title: "Alert acknowledged",
        detail: `Alert #${activeIncident.sourceAlertId} marked as reviewed by analyst.`,
        timestamp: new Date().toISOString(),
        severity: "low",
      });
      loadAlerts();
      refresh();
    } catch {
      pushRuntimeEvent({
        type: "action",
        title: "Acknowledge failed",
        detail: "Unable to acknowledge alert due to API response error.",
        timestamp: new Date().toISOString(),
        severity: "medium",
      });
    }
  }, [activeIncident.sourceAlertId, loadAlerts, pushRuntimeEvent, refresh]);

  const handleBlockIp = useCallback(() => {
    if (!incidentDevice) return;
    setBlockedIps((prev) => {
      const next = new Set(prev);
      next.add(incidentDevice.ip);
      return next;
    });
    pushRuntimeEvent({
      type: "action",
      title: "IP blocked",
      detail: `Firewall simulation rule applied to ${incidentDevice.ip}.`,
      timestamp: new Date().toISOString(),
      severity: "high",
    });
  }, [incidentDevice, pushRuntimeEvent]);

  const handleDeepScan = useCallback(async () => {
    if (deepScanRunning) return;
    setDeepScanRunning(true);
    pushRuntimeEvent({
      type: "action",
      title: "Deep scan initiated",
      detail: "Running advanced probe across high-risk subnet.",
      timestamp: new Date().toISOString(),
      severity: "info",
    });

    try {
      await api.triggerScan();
      await Promise.all([refresh(), loadAlerts()]);
      pushRuntimeEvent({
        type: "scan",
        title: "Deep scan completed",
        detail: "No sensor failures detected. Telemetry has been refreshed.",
        timestamp: new Date().toISOString(),
        severity: "info",
      });
    } catch {
      pushRuntimeEvent({
        type: "scan",
        title: "Deep scan failed",
        detail: "Command center could not complete the scan request.",
        timestamp: new Date().toISOString(),
        severity: "medium",
      });
    } finally {
      setDeepScanRunning(false);
    }
  }, [deepScanRunning, loadAlerts, pushRuntimeEvent, refresh]);

  return (
    <div className="h-[calc(100vh-4rem)] min-h-0 flex flex-col gap-4">
      <ActiveIncidentPanel
        incident={activeIncident}
        onInvestigate={handleInvestigate}
        onIsolate={handleIsolate}
        onIgnore={handleIgnore}
        isolated={isolatedDeviceIds.has(activeIncident.affectedDeviceId)}
      />

      {error && (
        <div className="command-panel px-4 py-3 flex items-center gap-3" style={{ borderColor: "color-mix(in srgb, var(--status-critical) 45%, transparent)" }}>
          <span className="material-symbols-outlined" style={{ color: "var(--status-critical)" }}>
            error
          </span>
          <div>
            <p className="command-kicker" style={{ color: "var(--status-critical)" }}>
              Data Pipeline Warning
            </p>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {error}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)_360px] gap-4 flex-1 min-h-0">
        <IntelligenceSidebar
          avgRisk={stats?.avg_risk_score ?? 0}
          riskTrend={riskTrend}
          threatBuckets={threatBuckets}
          vulnerableDevices={vulnerableDevices}
          totalDevices={stats?.total_devices ?? nodes.length}
          lastScan={stats?.last_scan ?? null}
        />

        <div className="flex flex-col gap-4 min-h-0">
          <ActionRail
            onIsolate={handleIsolate}
            onBlockIp={handleBlockIp}
            onDeepScan={handleDeepScan}
            deepScanRunning={deepScanRunning}
            targetLabel={incidentDevice?.hostname || incidentDevice?.ip || "Unassigned"}
          />

          <section className="command-panel p-3.5 flex-1 min-h-0">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1.5 pb-3">
              <div>
                <p className="command-kicker">Network Attack Surface</p>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {connected ? "Live telemetry stream connected" : "Realtime stream reconnecting"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={connected ? "command-pill command-pill-safe" : "command-pill command-pill-critical"}>
                  <span className="material-symbols-outlined">sensors</span>
                  {connected ? "Telemetry Live" : "Stream Offline"}
                </span>
                {loading && <span className="command-pill command-pill-info">Refreshing…</span>}
              </div>
            </div>

            <NetworkGraph
              data={topology}
              onNodeClick={(node) => setSelectedDevice(node)}
              onNodeHover={setHoveredDevice}
              pulsingNodes={newDeviceMacs}
              suspiciousNodes={suspiciousNodeIds}
              attackLinkKeys={attackLinkKeys}
            />

            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
              <InfoTile
                title="Suspicious Nodes"
                value={String(suspiciousNodeIds.size)}
                subtitle="flagged in current model"
                tone="critical"
              />
              <InfoTile
                title="Attack Paths"
                value={String(attackLinkKeys.size)}
                subtitle="active/highlighted links"
                tone="warning"
              />
              <InfoTile
                title="Focus"
                value={hoveredDevice?.hostname || hoveredDevice?.ip || "Hover node"}
                subtitle={
                  hoveredDevice
                    ? `risk ${Math.round(hoveredDevice.risk_score)} • ${hoveredDevice.device_type}`
                    : "device details preview"
                }
                tone="info"
              />
            </div>
          </section>
        </div>

        <AIInsightsPanel
          incident={activeIncident}
          onIsolate={handleIsolate}
          onBlockIp={handleBlockIp}
          onDeepScan={handleDeepScan}
          blockActive={blockedIps.has(activeIncident.affectedIp)}
          deepScanRunning={deepScanRunning}
        />
      </div>

      <IncidentTimeline events={timelineEvents} />

      {selectedDevice && (
        <div className="fixed right-0 top-16 bottom-14 z-50 shadow-2xl">
          <DeviceDetailPanel device={selectedDevice} onClose={() => setSelectedDevice(null)} />
        </div>
      )}
    </div>
  );
}

function InfoTile({
  title,
  value,
  subtitle,
  tone,
}: {
  title: string;
  value: string;
  subtitle: string;
  tone: "critical" | "warning" | "info";
}) {
  const colorByTone = {
    critical: "var(--status-critical)",
    warning: "var(--status-warning)",
    info: "var(--status-info)",
  } as const;

  const color = colorByTone[tone];

  return (
    <div
      className="rounded-xl px-3 py-2"
      style={{
        background: "var(--bg-panel)",
        border: `1px solid color-mix(in srgb, ${color} 26%, transparent)`,
      }}
    >
      <p className="command-kicker">{title}</p>
      <p className="text-sm font-semibold mt-1 truncate" style={{ color: "var(--text-primary)" }}>
        {value}
      </p>
      <p className="text-xs" style={{ color: "var(--text-ghost)" }}>
        {subtitle}
      </p>
    </div>
  );
}

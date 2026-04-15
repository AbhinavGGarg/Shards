"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNetworkData } from "@/hooks/useNetworkData";
import { useWebSocket } from "@/hooks/useWebSocket";
import { api, type Alert, type TopologyNode } from "@/lib/api";
import NetworkGraph from "./components/NetworkGraph";
import DeviceDetailPanel from "./components/DeviceDetailPanel";

type InterfaceMode = "normal" | "incident";
type Severity = "critical" | "high" | "medium" | "low" | "info";

interface LiveIncident {
  id: string;
  title: string;
  affectedDevice: string;
  affectedDeviceId: string;
  affectedIp: string;
  riskLabel: "LOW" | "MED" | "HIGH" | "CRITICAL";
  riskScore: number;
  confidence: number;
  timestamp: string;
  reasoning: string[];
  suggestedActions: string[];
}

interface TimelineEvent {
  id: string;
  type: "scan" | "detection" | "alert" | "action";
  title: string;
  detail: string;
  timestamp: string;
  severity: Severity;
}

function edgeKey(a: string, b: string): string {
  return [a, b].sort().join("::");
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function severityRank(severity: string): number {
  const norm = severity.toLowerCase();
  if (norm === "critical") return 4;
  if (norm === "high") return 3;
  if (norm === "medium") return 2;
  if (norm === "low") return 1;
  return 0;
}

function riskLabelFromScore(score: number): LiveIncident["riskLabel"] {
  if (score >= 80) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 35) return "MED";
  return "LOW";
}

function incidentFromNode(node: TopologyNode): LiveIncident {
  const score = Math.round(node.risk_score);
  const confidence = clamp(50 + Math.round(score * 0.45), 55, 99);
  const serviceList = Object.keys(node.open_ports ?? {}).slice(0, 3).join(", ") || "no major exposed ports";

  return {
    id: `node-${node.id}`,
    title: score >= 65 ? "Suspicious lateral movement signature" : "Anomalous host behavior detected",
    affectedDevice: node.hostname || node.ip,
    affectedDeviceId: node.id,
    affectedIp: node.ip,
    riskLabel: riskLabelFromScore(score),
    riskScore: score,
    confidence,
    timestamp: new Date().toISOString(),
    reasoning: [
      `Host risk score ${score} exceeds adaptive network baseline.`,
      `Observed service profile: ${serviceList}.`,
      "Traffic pattern suggests east-west probing activity.",
    ],
    suggestedActions: [
      "Isolate endpoint and preserve volatile evidence.",
      "Run deep network scan on adjacent assets.",
      "Block suspicious outbound route and review IAM logs.",
    ],
  };
}

function incidentFromAlert(alert: Alert, device: TopologyNode | null): LiveIncident {
  const baseScore = device?.risk_score ?? (alert.severity === "critical" ? 90 : alert.severity === "high" ? 74 : 48);
  const score = Math.round(baseScore);
  const confidence = clamp(Math.round(score * 0.7) + 24, 58, 99);

  return {
    id: `alert-${alert.id}`,
    title: alert.alert_type.replaceAll("_", " "),
    affectedDevice: device?.hostname || device?.ip || "Unknown endpoint",
    affectedDeviceId: device?.id || alert.device_mac || "unknown",
    affectedIp: device?.ip || "unknown",
    riskLabel: riskLabelFromScore(score),
    riskScore: score,
    confidence,
    timestamp: alert.timestamp,
    reasoning: [
      `Alert stream classified this event as ${alert.severity.toUpperCase()} severity.`,
      alert.message,
      "Correlated sequence indicates potential lateral movement attempt.",
    ],
    suggestedActions: [
      "Trigger endpoint isolation workflow.",
      "Block source-to-target communication path.",
      "Run immediate deep scan and collect host forensics.",
    ],
  };
}

export default function BattlespacePage() {
  const { topology, stats, loading, error, refresh } = useNetworkData();
  const { connected, on } = useWebSocket();

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<TopologyNode | null>(null);
  const [focusedIncident, setFocusedIncident] = useState<LiveIncident | null>(null);
  const [hoveredNode, setHoveredNode] = useState<TopologyNode | null>(null);
  const [runtimeEvents, setRuntimeEvents] = useState<TimelineEvent[]>([]);
  const [isolatedDevices, setIsolatedDevices] = useState<Set<string>>(new Set());
  const [blockedIps, setBlockedIps] = useState<Set<string>>(new Set());
  const [scanRunning, setScanRunning] = useState(false);

  const nodes = topology?.nodes ?? [];

  const pushEvent = useCallback((event: Omit<TimelineEvent, "id">) => {
    const id = `evt-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    setRuntimeEvents((prev) => [{ id, ...event }, ...prev].slice(0, 30));
  }, []);

  const loadAlerts = useCallback(async () => {
    try {
      const data = await api.getAlerts();
      setAlerts(data);
    } catch {
      // Keep UI resilient even if alerts endpoint has transient issues.
    }
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  useEffect(() => {
    const unsubscribers = [
      on("scan_complete", (payload: unknown) => {
        const data = payload as { devices_found?: number };
        pushEvent({
          type: "scan",
          title: "Telemetry sweep completed",
          detail: `Scanner refreshed attack surface map (${data.devices_found ?? "n/a"} assets).`,
          timestamp: new Date().toISOString(),
          severity: "info",
        });
        refresh();
        loadAlerts();
      }),
      on("alert", () => {
        pushEvent({
          type: "alert",
          title: "Threat signal generated",
          detail: "Detection model emitted a new alert from network telemetry.",
          timestamp: new Date().toISOString(),
          severity: "high",
        });
        refresh();
        loadAlerts();
      }),
      on("device_joined", (payload: unknown) => {
        const data = payload as { ip?: string };
        pushEvent({
          type: "detection",
          title: "Endpoint joined monitored segment",
          detail: `${data.ip ?? "Unknown endpoint"} added to live graph.`,
          timestamp: new Date().toISOString(),
          severity: "low",
        });
        refresh();
      }),
      on("port_change", () => {
        pushEvent({
          type: "detection",
          title: "Service fingerprint changed",
          detail: "Open-port profile changed on a tracked device.",
          timestamp: new Date().toISOString(),
          severity: "medium",
        });
        refresh();
      }),
    ];

    return () => unsubscribers.forEach((u) => u());
  }, [loadAlerts, on, pushEvent, refresh]);

  const sortedAlerts = useMemo(
    () =>
      [...alerts].sort((a, b) => {
        const sevDiff = severityRank(b.severity) - severityRank(a.severity);
        if (sevDiff !== 0) return sevDiff;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      }),
    [alerts]
  );

  const autoIncident = useMemo(() => {
    const openAlert = sortedAlerts.find((a) => !a.acknowledged && severityRank(a.severity) >= 2) ?? sortedAlerts[0];
    if (openAlert) {
      const device = openAlert.device_mac ? nodes.find((n) => n.id === openAlert.device_mac) ?? null : null;
      return incidentFromAlert(openAlert, device);
    }

    const highRisk = [...nodes].sort((a, b) => b.risk_score - a.risk_score)[0];
    if (highRisk && highRisk.risk_score >= 68) {
      return incidentFromNode(highRisk);
    }

    return null;
  }, [nodes, sortedAlerts]);

  const activeIncident = focusedIncident ?? autoIncident;
  const mode: InterfaceMode = activeIncident ? "incident" : "normal";

  useEffect(() => {
    if (!focusedIncident) return;
    const stillExists = nodes.some((node) => node.id === focusedIncident.affectedDeviceId);
    if (!stillExists) setFocusedIncident(null);
  }, [focusedIncident, nodes]);

  const attackPathNodeIds = useMemo(() => {
    if (!topology || !activeIncident) return [] as string[];

    const path: string[] = [];
    const router = topology.nodes.find((n) => n.is_router);
    if (router) path.push(router.id);
    if (activeIncident.affectedDeviceId !== "unknown") path.push(activeIncident.affectedDeviceId);

    const peer = topology.nodes.find(
      (node) =>
        node.id !== activeIncident.affectedDeviceId &&
        node.id !== router?.id &&
        (node.risk_score >= 55 || blockedIps.has(node.ip))
    );
    if (peer) path.push(peer.id);

    return path;
  }, [activeIncident, blockedIps, topology]);

  const suspiciousNodeIds = useMemo(() => {
    const set = new Set<string>();

    nodes.forEach((node) => {
      if (node.risk_score >= 62) set.add(node.id);
    });

    alerts.forEach((alert) => {
      if (alert.device_mac) set.add(alert.device_mac);
    });

    attackPathNodeIds.forEach((id) => set.add(id));
    isolatedDevices.forEach((id) => set.add(id));

    return set;
  }, [alerts, attackPathNodeIds, isolatedDevices, nodes]);

  const attackLinkKeys = useMemo(() => {
    const keys = new Set<string>();
    if (!topology) return keys;

    for (let i = 0; i < attackPathNodeIds.length - 1; i += 1) {
      keys.add(edgeKey(attackPathNodeIds[i], attackPathNodeIds[i + 1]));
    }

    topology.edges.forEach((edge) => {
      if (suspiciousNodeIds.has(edge.source) && suspiciousNodeIds.has(edge.target)) {
        keys.add(edgeKey(edge.source, edge.target));
      }
    });

    return keys;
  }, [attackPathNodeIds, suspiciousNodeIds, topology]);

  const timeline = useMemo<TimelineEvent[]>(() => {
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
            id: "scan-last",
            type: "scan",
            title: "Background monitoring cycle",
            detail: `Observed ${stats.total_devices} monitored devices in latest cycle.`,
            timestamp: stats.last_scan,
            severity: "info",
          },
        ]
      : [];

    return [...runtimeEvents, ...scanEvent, ...alertEvents]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 16);
  }, [runtimeEvents, sortedAlerts, stats?.last_scan, stats?.total_devices]);

  const riskValue = stats?.avg_risk_score ?? 0;
  const riskTone = riskValue >= 70 ? "var(--status-critical)" : riskValue >= 40 ? "var(--status-warning)" : "var(--status-healthy)";

  const runScan = useCallback(async () => {
    if (scanRunning) return;
    setScanRunning(true);
    pushEvent({
      type: "action",
      title: "Deep scan triggered",
      detail: "Executing active scan workflow across monitored segment.",
      timestamp: new Date().toISOString(),
      severity: "info",
    });

    try {
      await api.triggerScan();
      await Promise.all([refresh(), loadAlerts()]);
    } finally {
      setScanRunning(false);
    }
  }, [loadAlerts, pushEvent, refresh, scanRunning]);

  const isolateDevice = useCallback(() => {
    if (!activeIncident) return;
    setIsolatedDevices((prev) => {
      const next = new Set(prev);
      next.add(activeIncident.affectedDeviceId);
      return next;
    });
    pushEvent({
      type: "action",
      title: "Isolation command dispatched",
      detail: `${activeIncident.affectedDevice} moved into quarantine VLAN (simulated).`,
      timestamp: new Date().toISOString(),
      severity: "high",
    });
  }, [activeIncident, pushEvent]);

  const blockIp = useCallback(() => {
    if (!activeIncident) return;
    setBlockedIps((prev) => {
      const next = new Set(prev);
      next.add(activeIncident.affectedIp);
      return next;
    });
    pushEvent({
      type: "action",
      title: "IP blocked",
      detail: `Adaptive policy denied outbound communication from ${activeIncident.affectedIp}.`,
      timestamp: new Date().toISOString(),
      severity: "high",
    });
  }, [activeIncident, pushEvent]);

  const focusThreat = useCallback(
    (incident: LiveIncident) => {
      setFocusedIncident(incident);
      pushEvent({
        type: "action",
        title: "Incident focus mode engaged",
        detail: `Analyst centered battlespace on ${incident.affectedDevice}.`,
        timestamp: new Date().toISOString(),
        severity: "info",
      });
    },
    [pushEvent]
  );

  return (
    <div className={`battlespace-root ${mode === "incident" ? "incident" : "normal"}`}>
      <div className="battlespace-stage">
        <NetworkGraph
          data={topology}
          mode={mode}
          focusNodeId={activeIncident?.affectedDeviceId ?? null}
          suspiciousNodes={suspiciousNodeIds}
          attackLinkKeys={attackLinkKeys}
          onNodeClick={(node) => {
            setSelectedDevice(node);
            if (mode === "normal" && node.risk_score >= 40) {
              focusThreat(incidentFromNode(node));
            }
          }}
          onNodeHover={setHoveredNode}
          height={Math.max(560, mode === "incident" ? 700 : 640)}
          className="battlespace-graph"
        />

        <div className="battlespace-dim-layer" />

        <div className="battlespace-headline">
          <p className="command-kicker">Live Cyber Battlespace</p>
          <h2>{mode === "incident" ? "Active Incident Response" : "Network Monitoring"}</h2>
          <p>
            {mode === "incident"
              ? "Threat response mode engaged. Focused containment and investigation controls are active."
              : "Calm-state telemetry. Systems are monitored continuously with adaptive anomaly detection."}
          </p>
        </div>

        {mode === "incident" && activeIncident && (
          <section className="incident-focus-panel">
            <p className="command-kicker">Incident Focus</p>
            <h3>{activeIncident.title}</h3>
            <p className="incident-focus-sub">
              Affected device: <strong>{activeIncident.affectedDevice}</strong> · Risk {activeIncident.riskLabel} · Confidence {activeIncident.confidence}%
            </p>
            <div className="incident-focus-path">
              {attackPathNodeIds.length > 0 ? (
                attackPathNodeIds.map((id, idx) => {
                  const node = nodes.find((n) => n.id === id);
                  return (
                    <span key={id} className="incident-path-node">
                      {node?.hostname || node?.ip || id.slice(0, 6)}
                      {idx < attackPathNodeIds.length - 1 && <span className="incident-path-arrow">→</span>}
                    </span>
                  );
                })
              ) : (
                <span className="incident-path-node">Awaiting attack path telemetry…</span>
              )}
            </div>
            <div className="incident-actions">
              <button onClick={isolateDevice} className="command-btn">
                <span className="material-symbols-outlined">link_off</span>
                Isolate Device
              </button>
              <button
                onClick={blockIp}
                className="command-btn"
                style={{
                  color: "var(--status-critical)",
                  borderColor: "color-mix(in srgb, var(--status-critical) 44%, transparent)",
                  background: "color-mix(in srgb, var(--status-critical) 14%, transparent)",
                }}
              >
                <span className="material-symbols-outlined">gpp_bad</span>
                Block IP
              </button>
              <button onClick={runScan} className="command-btn command-btn-primary" disabled={scanRunning}>
                <span className={`material-symbols-outlined ${scanRunning ? "animate-spin" : ""}`}>
                  {scanRunning ? "progress_activity" : "radar"}
                </span>
                {scanRunning ? "Running Scan" : "Run Scan"}
              </button>
            </div>
          </section>
        )}

        <aside className="battlespace-ai-panel">
          <div className="battlespace-ai-head">
            <p className="command-kicker">AI Operator</p>
            <span className={mode === "incident" ? "command-pill command-pill-critical" : "command-pill command-pill-safe"}>
              {mode === "incident" ? "Active" : "Idle"}
            </span>
          </div>

          {mode === "normal" || !activeIncident ? (
            <div className="battlespace-ai-idle">
              <h4>All systems operating normally</h4>
              <p>Telemetry models are stable. No confirmed incident requires focus mode.</p>

              <div className="idle-threat-list">
                {sortedAlerts.slice(0, 3).map((alert) => {
                  const device = alert.device_mac ? nodes.find((n) => n.id === alert.device_mac) ?? null : null;
                  const incident = incidentFromAlert(alert, device);
                  return (
                    <button key={alert.id} onClick={() => focusThreat(incident)} className="idle-threat-item">
                      <span>{alert.alert_type.replaceAll("_", " ")}</span>
                      <small>{alert.severity.toUpperCase()}</small>
                    </button>
                  );
                })}
                {sortedAlerts.length === 0 && <p className="text-sm" style={{ color: "var(--text-ghost)" }}>No active threat signals.</p>}
              </div>
            </div>
          ) : (
            <div className="battlespace-ai-active">
              <h4>AI explanation</h4>
              <ul>
                {activeIncident.reasoning.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>

              <h5>Suggested actions</h5>
              <ul>
                {activeIncident.suggestedActions.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>

              <div className="ai-meta">
                <span>Confidence {activeIncident.confidence}%</span>
                <button className="command-btn command-btn-muted" onClick={() => setFocusedIncident(null)}>
                  Return to monitoring
                </button>
              </div>
            </div>
          )}
        </aside>

        <section className={`battlespace-bottom ${mode === "incident" ? "expanded" : "compact"}`}>
          {mode === "normal" ? (
            <div className="battlespace-metrics-inline">
              <MetricInline label="Risk Score" value={riskValue.toFixed(1)} tone={riskTone} />
              <MetricInline label="Devices" value={String(stats?.total_devices ?? nodes.length)} tone="var(--status-info)" />
              <MetricInline label="Alerts" value={String(alerts.length)} tone={alerts.length > 0 ? "var(--status-warning)" : "var(--status-healthy)"} />
              <MetricInline label="Status" value={connected ? "Connected" : "Reconnecting"} tone={connected ? "var(--status-healthy)" : "var(--status-warning)"} />
            </div>
          ) : (
            <div className="battlespace-timeline">
              <div className="timeline-head">
                <p className="command-kicker">Incident Timeline</p>
                <span className="command-pill command-pill-info">Live events</span>
              </div>

              <div className="timeline-list">
                {timeline.map((event) => (
                  <div key={event.id} className="timeline-item">
                    <span className={`timeline-dot ${event.severity}`} />
                    <div>
                      <p className="timeline-title">{event.title}</p>
                      <p className="timeline-detail">{event.detail}</p>
                    </div>
                    <span className="timeline-time">{new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {hoveredNode && (
          <div className="battlespace-hover-readout">
            <span>{hoveredNode.hostname || hoveredNode.ip}</span>
            <span>Risk {Math.round(hoveredNode.risk_score)}</span>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3 command-panel px-4 py-3 text-sm" style={{ borderColor: "color-mix(in srgb, var(--status-critical) 45%, transparent)", color: "var(--text-secondary)" }}>
          Data stream warning: {error}
        </div>
      )}

      {selectedDevice && (
        <div className="fixed right-0 top-16 bottom-0 z-50 shadow-2xl">
          <DeviceDetailPanel device={selectedDevice} onClose={() => setSelectedDevice(null)} />
        </div>
      )}

      {loading && (
        <div className="battlespace-loading">
          <div className="w-10 h-10 rounded-full border-2 border-[var(--status-info)] border-t-transparent animate-spin" />
        </div>
      )}
    </div>
  );
}

function MetricInline({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="metric-inline">
      <p>{label}</p>
      <strong style={{ color: tone }}>{value}</strong>
    </div>
  );
}

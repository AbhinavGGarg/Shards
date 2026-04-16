/**
 * Typed API client for the Fragments backend.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface Device {
  mac: string;
  ip: string;
  hostname: string;
  vendor: string;
  os: string;
  device_type: string;
  open_ports: Record<string, string>;
  services: Record<string, string>;
  risk_score: number;
  is_trusted: boolean;
  is_flagged: boolean;
  cves: string[];
  first_seen: string;
  last_seen: string;
}

export interface Alert {
  id: number;
  timestamp: string;
  alert_type: string;
  severity: string;
  device_mac: string | null;
  message: string;
  acknowledged: boolean;
}

export interface ScanResult {
  scan_id: number;
  status: string;
  devices_found: number;
}

export interface TopologyData {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

export interface TopologyNode {
  id: string;
  ip: string;
  hostname: string;
  vendor: string;
  device_type: string;
  risk_score: number;
  open_ports: Record<string, string>;
  is_router: boolean;
}

export interface TopologyEdge {
  source: string;
  target: string;
}

export interface Stats {
  total_devices: number;
  avg_risk_score: number;
  unacknowledged_alerts: number;
  last_scan: string | null;
}

export interface ComplianceFramework {
  id: string;
  name: string;
  version: string;
  controls_count: number;
  upload_date: string;
}

export interface ComplianceAssessmentResult {
  assessment_id: number;
  framework: string;
  controls_assessed: number;
  compliant: number;
  partial: number;
  non_compliant: number;
  report_path: string;
}

export interface ComplianceUploadResponse {
  framework_id: string;
  name: string;
  controls_parsed: number;
}

export interface AttackSimulationStep {
  from_ip: string;
  from_host: string;
  to_ip: string;
  to_host: string;
  method: string;
  risk: number;
}

export interface AttackSimulationResult {
  path: string[];
  narration: string;
  steps: AttackSimulationStep[];
  source: string;
}

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => fetchApi<{ status: string }>("/health"),

  // Scanning
  triggerScan: () => fetchApi<ScanResult>("/api/scan", { method: "POST" }),

  // Devices
  getDevices: () => fetchApi<Device[]>("/api/devices"),
  getDevice: (mac: string) => fetchApi<Device>(`/api/devices/${encodeURIComponent(mac)}`),
  trustDevice: (mac: string) =>
    fetchApi<{ success: boolean }>(`/api/devices/${encodeURIComponent(mac)}/trust`, { method: "PATCH" }),

  // Topology
  getTopology: () => fetchApi<TopologyData>("/api/topology"),

  // Stats
  getStats: () => fetchApi<Stats>("/api/stats"),

  // Alerts
  getAlerts: (params?: { severity?: string; type?: string }) => {
    const search = new URLSearchParams();
    if (params?.severity) search.set("severity", params.severity);
    if (params?.type) search.set("type", params.type);
    const qs = search.toString();
    return fetchApi<Alert[]>(`/api/alerts${qs ? `?${qs}` : ""}`);
  },
  acknowledgeAlert: (id: number) =>
    fetchApi<{ success: boolean }>(`/api/alerts/${id}/ack`, { method: "PATCH" }),

  // RAG Chat
  queryChat: (question: string) =>
    fetchApi<{ response: string; sources: string[] }>("/api/rag/query", {
      method: "POST",
      body: JSON.stringify({ question }),
    }),
  getChatHistory: () => fetchApi<{ messages: Array<{ role: string; content: string }> }>("/api/rag/history"),
  triggerIngest: () => fetchApi<{ status: string }>("/api/rag/ingest", { method: "POST" }),

  // Compliance
  uploadComplianceFramework: (payload: {
    framework_name: string;
    filename: string;
    content: unknown;
  }) =>
    fetchApi<ComplianceUploadResponse>("/api/compliance/upload", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getFrameworks: () => fetchApi<ComplianceFramework[]>("/api/compliance/frameworks"),
  assessCompliance: (frameworkId: string) =>
    fetchApi<ComplianceAssessmentResult>("/api/compliance/assess", {
      method: "POST",
      body: JSON.stringify({ framework_id: frameworkId }),
    }),

  // Report
  generateReport: () =>
    fetchApi<{ report_url: string }>("/api/report", { method: "POST" }),

  // Attack simulation
  simulateAttack: (deviceId: string) =>
    fetchApi<AttackSimulationResult>("/api/ai/attack-sim", {
      method: "POST",
      body: JSON.stringify({ device_id: deviceId }),
    }),
};

export type IncidentRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface ActiveIncident {
  id: string;
  title: string;
  affectedDevice: string;
  affectedDeviceId: string;
  affectedIp: string;
  riskLevel: IncidentRiskLevel;
  confidence: number;
  timestamp: string;
  summary: string;
  whyFlagged: string[];
  suggestedActions: string[];
  relatedVulnerabilities: string[];
  sourceAlertId?: number;
}

export type TimelineSeverity = "critical" | "high" | "medium" | "low" | "info";

export interface TimelineEvent {
  id: string;
  type: "scan" | "detection" | "alert" | "action";
  title: string;
  detail: string;
  timestamp: string;
  severity: TimelineSeverity;
}

export interface VulnerableDeviceSummary {
  id: string;
  label: string;
  ip: string;
  risk: number;
  openPortCount: number;
}

export interface ThreatSeverityBuckets {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

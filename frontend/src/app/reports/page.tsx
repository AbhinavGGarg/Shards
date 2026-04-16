"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChartColumn,
  CheckCircle2,
  FileText,
  LoaderCircle,
  Settings2,
  Sparkles,
  Table2,
  Timer,
} from "lucide-react";
import { useNetworkData } from "@/hooks/useNetworkData";
import { api, type Alert, type Device } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const HISTORY_KEY = "fragments-report-history-v1";

type ReportStep = "overview" | "configuration" | "preview" | "generate" | "history";

type ReportConfig = {
  title: string;
  audience: "executive" | "soc" | "compliance";
  timeframe: "24h" | "7d" | "30d";
  includeTopology: boolean;
  includeThreats: boolean;
  includeRecommendations: boolean;
  notes: string;
};

type ReportHistoryEntry = {
  id: string;
  createdAt: string;
  title: string;
  audience: ReportConfig["audience"];
  timeframe: ReportConfig["timeframe"];
  url: string;
};

const stepOrder: Array<{ id: ReportStep; title: string; helper: string }> = [
  { id: "overview", title: "Overview", helper: "Operational summary" },
  { id: "configuration", title: "Configuration", helper: "Scope and options" },
  { id: "preview", title: "Preview", helper: "Validate content" },
  { id: "generate", title: "Generate", helper: "Build report file" },
  { id: "history", title: "History", helper: "Past exports" },
];

export default function ReportsPage() {
  const { devices, stats, refresh } = useNetworkData();

  const [alerts, setAlerts] = React.useState<Alert[]>([]);
  const [activeStep, setActiveStep] = React.useState<ReportStep>("overview");
  const [config, setConfig] = React.useState<ReportConfig>({
    title: "Fragments Incident Review",
    audience: "executive",
    timeframe: "7d",
    includeTopology: true,
    includeThreats: true,
    includeRecommendations: true,
    notes: "Highlight top 3 high-risk assets and immediate containment recommendations.",
  });
  const [history, setHistory] = React.useState<ReportHistoryEntry[]>([]);
  const [generatedUrl, setGeneratedUrl] = React.useState<string | null>(null);
  const [generating, setGenerating] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);

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
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as ReportHistoryEntry[];
      setHistory(Array.isArray(parsed) ? parsed : []);
    } catch {
      setHistory([]);
    }
  }, []);

  React.useEffect(() => {
    if (!status) return;
    const timer = setTimeout(() => setStatus(null), 2400);
    return () => clearTimeout(timer);
  }, [status]);

  const severity = React.useMemo(() => {
    const critical = alerts.filter((item) => ["critical", "high"].includes(item.severity.toLowerCase())).length;
    const warning = alerts.filter((item) => item.severity.toLowerCase() === "medium").length;
    const safe = Math.max((stats?.total_devices ?? devices.length) - critical - warning, 0);
    return { critical, warning, safe };
  }, [alerts, devices.length, stats?.total_devices]);

  const topRiskDevices = React.useMemo(
    () => [...devices].sort((a, b) => b.risk_score - a.risk_score).slice(0, 5),
    [devices]
  );

  const stepIndex = stepOrder.findIndex((step) => step.id === activeStep);

  const goToStep = React.useCallback((step: ReportStep) => {
    setError(null);
    setActiveStep(step);
  }, []);

  const nextStep = React.useCallback(() => {
    const next = stepOrder[stepIndex + 1];
    if (next) goToStep(next.id);
  }, [goToStep, stepIndex]);

  const prevStep = React.useCallback(() => {
    const prev = stepOrder[stepIndex - 1];
    if (prev) goToStep(prev.id);
  }, [goToStep, stepIndex]);

  const refreshData = React.useCallback(async () => {
    await Promise.all([refresh(), loadAlerts()]);
    setStatus("Data refreshed");
  }, [loadAlerts, refresh]);

  const generateReport = React.useCallback(async () => {
    setGenerating(true);
    setProgress(12);
    setError(null);
    setStatus(null);

    const interval = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 90) return current;
        return Math.min(90, current + Math.floor(Math.random() * 10) + 4);
      });
    }, 420);

    try {
      const result = await api.generateReport();
      const fullUrl = result.report_url.startsWith("http") ? result.report_url : `${API_BASE}${result.report_url}`;
      setGeneratedUrl(fullUrl);
      setProgress(100);

      const entry: ReportHistoryEntry = {
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `report-${Date.now()}`,
        createdAt: new Date().toISOString(),
        title: config.title,
        audience: config.audience,
        timeframe: config.timeframe,
        url: fullUrl,
      };

      setHistory((previous) => {
        const next = [entry, ...previous].slice(0, 12);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
        return next;
      });

      setStatus("Report generated successfully");
      setActiveStep("history");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate report");
      setProgress(0);
    } finally {
      window.clearInterval(interval);
      setGenerating(false);
    }
  }, [config.audience, config.timeframe, config.title]);

  return (
    <div className="space-y-6" id="generate">
      <Card>
        <CardHeader>
          <CardTitle>Reports Studio Workflow</CardTitle>
          <CardDescription>
            Build operator-ready security reports with guided flow from scope definition to artifact history.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 md:grid-cols-5">
            {stepOrder.map((step, index) => {
              const active = step.id === activeStep;
              const complete = index < stepIndex;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => goToStep(step.id)}
                  className={`rounded-xl border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--status-info)]/60 ${
                    active
                      ? "border-[color:var(--status-info)]/50 bg-[color:var(--status-info)]/10"
                      : "border-[color:var(--border-soft)] bg-[color:var(--bg-panel)] hover:border-[color:var(--status-info)]/35"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--text-ghost)]">{step.title}</p>
                    {complete && <CheckCircle2 className="h-4 w-4 text-[color:var(--status-healthy)]" />}
                  </div>
                  <p className="mt-1 text-sm text-[color:var(--text-secondary)]">{step.helper}</p>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void refreshData()}>
              Refresh Telemetry
            </Button>
            <Button variant="secondary" onClick={prevStep} disabled={stepIndex === 0}>
              Previous
            </Button>
            <Button onClick={nextStep} disabled={stepIndex === stepOrder.length - 1}>
              Next
            </Button>
          </div>

          {status && <p className="text-sm text-[color:var(--status-info)]">{status}</p>}
          {error && <p className="text-sm text-[color:var(--status-critical)]">{error}</p>}
        </CardContent>
      </Card>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeStep}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
        >
          {activeStep === "overview" && (
            <Card>
              <CardHeader>
                <CardTitle>1. Operational Overview</CardTitle>
                <CardDescription>Live posture summary included in the report executive section.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-4">
                <MetricTile label="Devices" value={String(stats?.total_devices ?? devices.length)} icon={ChartColumn} tone="default" />
                <MetricTile label="Avg risk" value={(stats?.avg_risk_score ?? 0).toFixed(1)} icon={Timer} tone="warning" />
                <MetricTile label="Critical" value={String(severity.critical)} icon={Sparkles} tone="critical" />
                <MetricTile label="Warnings" value={String(severity.warning)} icon={Table2} tone="warning" />
              </CardContent>
            </Card>
          )}

          {activeStep === "configuration" && (
            <Card>
              <CardHeader>
                <CardTitle>2. Report Configuration</CardTitle>
                <CardDescription>Define audience, scope, and included sections for this report.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="report-title">Report Title</Label>
                  <Input
                    id="report-title"
                    value={config.title}
                    onChange={(event) => setConfig((prev) => ({ ...prev, title: event.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Audience</Label>
                  <Select
                    value={config.audience}
                    onValueChange={(value: ReportConfig["audience"]) =>
                      setConfig((prev) => ({ ...prev, audience: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="executive">Executive leadership</SelectItem>
                      <SelectItem value="soc">SOC operators</SelectItem>
                      <SelectItem value="compliance">Compliance & audit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Time window</Label>
                  <Select
                    value={config.timeframe}
                    onValueChange={(value: ReportConfig["timeframe"]) =>
                      setConfig((prev) => ({ ...prev, timeframe: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24h">Last 24 hours</SelectItem>
                      <SelectItem value="7d">Last 7 days</SelectItem>
                      <SelectItem value="30d">Last 30 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--bg-panel)] p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--text-ghost)]">Sections</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <ToggleOption
                      label="Topology"
                      checked={config.includeTopology}
                      onChange={(checked) => setConfig((prev) => ({ ...prev, includeTopology: checked }))}
                    />
                    <ToggleOption
                      label="Threat analysis"
                      checked={config.includeThreats}
                      onChange={(checked) => setConfig((prev) => ({ ...prev, includeThreats: checked }))}
                    />
                    <ToggleOption
                      label="Recommendations"
                      checked={config.includeRecommendations}
                      onChange={(checked) => setConfig((prev) => ({ ...prev, includeRecommendations: checked }))}
                    />
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="notes">Analyst Notes</Label>
                  <Textarea
                    id="notes"
                    value={config.notes}
                    onChange={(event) => setConfig((prev) => ({ ...prev, notes: event.target.value }))}
                    className="min-h-[120px]"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {activeStep === "preview" && (
            <Card>
              <CardHeader>
                <CardTitle>3. Preview</CardTitle>
                <CardDescription>Inspect what will be included before generating the final artifact.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--bg-panel)] p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--text-ghost)]">Summary section</p>
                  <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
                    <span className="font-medium text-[color:var(--text-primary)]">{config.title}</span> prepared for {config.audience} covering {config.timeframe}. Includes
                    {config.includeTopology ? " topology" : " topology omitted"},
                    {config.includeThreats ? " threat analytics" : " threat analytics omitted"}, and
                    {config.includeRecommendations ? " recommendations." : " recommendations omitted."}
                  </p>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Device</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>Risk</TableHead>
                      <TableHead>Trust</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(topRiskDevices.length > 0
                      ? topRiskDevices
                      : [
                          {
                            mac: "none",
                            hostname: "No data available",
                            ip: "Run a scan to populate preview",
                            risk_score: 0,
                            is_trusted: false,
                          } as Device,
                        ]
                    ).map((device) => (
                      <TableRow key={device.mac}>
                        <TableCell>
                          <p className="font-medium">{device.hostname || "Unknown"}</p>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{device.ip}</TableCell>
                        <TableCell>
                          <Badge variant={device.risk_score >= 70 ? "critical" : device.risk_score >= 40 ? "warning" : "success"}>
                            {Math.round(device.risk_score)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={device.is_trusted ? "success" : "warning"}>
                            {device.mac === "none" ? "No signal" : device.is_trusted ? "Trusted" : "Untrusted"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {activeStep === "generate" && (
            <Card>
              <CardHeader>
                <CardTitle>4. Generate</CardTitle>
                <CardDescription>Create the report PDF and publish it to your report history.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--bg-panel)] p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--text-ghost)]">Generation status</p>
                  <div className="mt-3 h-2 rounded-full bg-[color:var(--bg-deep)]">
                    <motion.div
                      className="h-full rounded-full bg-[color:var(--status-info)]"
                      animate={{ width: `${progress}%` }}
                      transition={{ type: "spring", stiffness: 140, damping: 24 }}
                    />
                  </div>
                  <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
                    {generating ? `Compiling report... ${progress}%` : "Ready to generate"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => void generateReport()} disabled={generating}>
                    {generating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                    {generating ? "Generating..." : "Generate Report"}
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={!generatedUrl}
                    onClick={() => {
                      if (!generatedUrl) return;
                      window.open(generatedUrl, "_blank", "noopener,noreferrer");
                    }}
                  >
                    Download Latest
                  </Button>
                  <Button variant="secondary" onClick={() => goToStep("history")}>
                    View History
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeStep === "history" && (
            <Card>
              <CardHeader>
                <CardTitle>5. Report History</CardTitle>
                <CardDescription>Access previously generated report artifacts and rerun quickly.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(history.length > 0
                  ? history
                  : [
                      {
                        id: "bootstrap",
                        createdAt: new Date().toISOString(),
                        title: "No generated reports yet",
                        audience: "executive",
                        timeframe: "7d",
                        url: "",
                      } as ReportHistoryEntry,
                    ]
                ).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--bg-panel)] p-4"
                  >
                    <div>
                      <p className="font-medium">{entry.title}</p>
                      <p className="text-xs text-[color:var(--text-ghost)]">
                        {new Date(entry.createdAt).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {" · "}
                        {entry.audience}
                        {" · "}
                        {entry.timeframe}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={!entry.url}
                        onClick={() => {
                          if (!entry.url) return;
                          window.open(entry.url, "_blank", "noopener,noreferrer");
                        }}
                      >
                        Download
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setConfig((prev) => ({
                            ...prev,
                            title: entry.title,
                            audience: entry.audience,
                            timeframe: entry.timeframe,
                          }));
                          setStatus("Loaded report settings from history");
                          setActiveStep("configuration");
                        }}
                      >
                        Reuse Settings
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      <Card>
        <CardHeader>
          <CardTitle>Workflow Guidance</CardTitle>
          <CardDescription>Each step answers what happened, why it matters, and what to do next.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <GuidanceCard
            icon={ChartColumn}
            title="What is happening"
            detail="Overview captures current risk posture, detections, and network inventory context."
          />
          <GuidanceCard
            icon={Settings2}
            title="Why it matters"
            detail="Configuration ensures report output matches the audience and decision cadence."
          />
          <GuidanceCard
            icon={FileText}
            title="What to do"
            detail="Generate and distribute a signed PDF artifact, then reuse settings from history."
          />
        </CardContent>
      </Card>
    </div>
  );
}

function MetricTile({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "default" | "warning" | "critical";
}) {
  const variant = tone === "default" ? "default" : tone;

  return (
    <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--bg-panel)] p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--text-ghost)]">{label}</p>
        <Badge variant={variant}>
          <Icon className="h-3.5 w-3.5" />
        </Badge>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function ToggleOption({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--bg-card)] px-3 py-2 text-sm">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-[color:var(--status-info)]"
      />
    </label>
  );
}

function GuidanceCard({
  icon: Icon,
  title,
  detail,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--bg-panel)] p-4">
      <div className="flex items-center gap-2">
        <Badge variant="default">
          <Icon className="h-3.5 w-3.5" />
        </Badge>
        <p className="text-sm font-medium">{title}</p>
      </div>
      <p className="mt-2 text-sm text-[color:var(--text-secondary)]">{detail}</p>
    </div>
  );
}

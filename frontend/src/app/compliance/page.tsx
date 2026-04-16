"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, FileUp, Gauge, RefreshCcw, ShieldCheck, TriangleAlert } from "lucide-react";
import { api, getRuntimeApiBase, type ComplianceAssessmentResult, type ComplianceFramework } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const defaultFramework = `[
  {
    "control_id": "AC-2",
    "title": "Account Management",
    "description": "The organization manages information system accounts."
  },
  {
    "control_id": "SI-4",
    "title": "System Monitoring",
    "description": "The organization monitors events on the information system."
  }
]`;

export default function CompliancePage() {
  const [frameworks, setFrameworks] = React.useState<ComplianceFramework[]>([]);
  const [assessment, setAssessment] = React.useState<ComplianceAssessmentResult | null>(null);
  const [frameworkName, setFrameworkName] = React.useState("SOC2 Custom Controls");
  const [frameworkPayload, setFrameworkPayload] = React.useState(defaultFramework);
  const [loading, setLoading] = React.useState(true);
  const [uploading, setUploading] = React.useState(false);
  const [assessingId, setAssessingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);

  const loadFrameworks = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getFrameworks();
      setFrameworks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load frameworks");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadFrameworks();
  }, [loadFrameworks]);

  React.useEffect(() => {
    if (!status) return;
    const timer = setTimeout(() => setStatus(null), 2600);
    return () => clearTimeout(timer);
  }, [status]);

  const handleUpload = React.useCallback(async () => {
    if (!frameworkName.trim()) {
      setError("Provide a framework name before uploading.");
      return;
    }

    if (!frameworkPayload.trim()) {
      setError("Provide framework content in JSON or text format.");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      let parsed: unknown = frameworkPayload;
      try {
        parsed = JSON.parse(frameworkPayload);
      } catch {
        // fallback to raw text content for parser compatibility
      }

      const upload = await api.uploadComplianceFramework({
        framework_name: frameworkName,
        filename: "controls.json",
        content: parsed,
      });

      await loadFrameworks();
      setStatus(`Uploaded ${upload.name} with ${upload.controls_parsed} controls`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [frameworkName, frameworkPayload, loadFrameworks]);

  const handleAssess = React.useCallback(async (frameworkId: string) => {
    setAssessingId(frameworkId);
    setError(null);
    try {
      const result = await api.assessCompliance(frameworkId);
      setAssessment(result);
      setStatus("Assessment completed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assessment failed");
    } finally {
      setAssessingId(null);
    }
  }, []);

  const summary = React.useMemo(() => {
    if (!assessment) {
      return { score: 0, total: 0, compliant: 0, partial: 0, nonCompliant: 0 };
    }

    const total = assessment.compliant + assessment.partial + assessment.non_compliant;
    const score = total > 0 ? Math.round((assessment.compliant / total) * 100) : 0;

    return {
      score,
      total,
      compliant: assessment.compliant,
      partial: assessment.partial,
      nonCompliant: assessment.non_compliant,
    };
  }, [assessment]);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Compliance Framework Ingestion</CardTitle>
            <CardDescription>
              Upload control definitions, normalize them, then run an AI-assisted compliance assessment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="framework-name">Framework Name</Label>
              <Input
                id="framework-name"
                value={frameworkName}
                onChange={(event) => setFrameworkName(event.target.value)}
                placeholder="NIST CSF, ISO 27001, SOC 2..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="framework-json">Framework Content (JSON or text)</Label>
              <Textarea
                id="framework-json"
                value={frameworkPayload}
                onChange={(event) => setFrameworkPayload(event.target.value)}
                className="min-h-[220px] font-mono text-xs"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void handleUpload()} disabled={uploading}>
                <FileUp className="h-4 w-4" />
                {uploading ? "Uploading..." : "Upload Framework"}
              </Button>
              <Button variant="secondary" onClick={() => setFrameworkPayload(defaultFramework)}>
                Reset Template
              </Button>
              <Button variant="secondary" onClick={() => void loadFrameworks()} disabled={loading}>
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
            {error && <p className="text-sm text-[color:var(--status-critical)]">{error}</p>}
            {status && <p className="text-sm text-[color:var(--status-info)]">{status}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latest Assessment Outcome</CardTitle>
            <CardDescription>
              {assessment
                ? `${assessment.framework} assessed at ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                : "Run an assessment to generate compliance posture and downloadable evidence."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <motion.div
              layout
              className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--bg-panel)] p-4"
            >
              <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--text-ghost)]">Compliance score</p>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-4xl font-semibold tracking-tight">{summary.score}%</p>
                <Badge variant={summary.score >= 80 ? "success" : summary.score >= 60 ? "warning" : "critical"}>
                  <Gauge className="mr-1 h-3.5 w-3.5" />
                  {summary.total} controls
                </Badge>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <ScorePill label="Compliant" value={summary.compliant} tone="success" />
                <ScorePill label="Partial" value={summary.partial} tone="warning" />
                <ScorePill label="Gaps" value={summary.nonCompliant} tone="critical" />
              </div>
            </motion.div>

            <Button
              className="w-full"
              variant="secondary"
                disabled={!assessment}
                onClick={() => {
                  if (!assessment) return;
                  window.open(
                    `${getRuntimeApiBase()}/api/compliance/report/${assessment.assessment_id}`,
                    "_blank",
                    "noopener,noreferrer"
                  );
                }}
              >
              <CheckCircle2 className="h-4 w-4" />
              Download Assessment PDF
            </Button>

            <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--bg-panel)] p-4 text-sm text-[color:var(--text-secondary)]">
              <p className="font-medium text-[color:var(--text-primary)]">Why this matters</p>
              <p className="mt-2">
                This score blends control evidence and posture heuristics, making it easier to prioritize remediation before external audits.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Uploaded Frameworks</CardTitle>
          <CardDescription>Assess any framework and track evidence generation from the same workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Framework</TableHead>
                <TableHead>Controls</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(frameworks.length > 0
                ? frameworks
                : [
                    {
                      id: "none",
                      name: "No frameworks uploaded yet",
                      version: "",
                      controls_count: 0,
                      upload_date: new Date().toISOString(),
                    },
                  ]
              ).map((framework) => (
                <TableRow key={framework.id}>
                  <TableCell>
                    <p className="font-medium">{framework.name}</p>
                    <p className="text-xs text-[color:var(--text-ghost)]">ID: {framework.id}</p>
                  </TableCell>
                  <TableCell>{framework.controls_count}</TableCell>
                  <TableCell className="text-xs text-[color:var(--text-secondary)]">
                    {framework.id === "none"
                      ? "Awaiting upload"
                      : new Date(framework.upload_date).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                  </TableCell>
                  <TableCell>
                    {framework.id === "none" ? (
                      <Badge variant="muted">No data</Badge>
                    ) : (
                      <Badge variant="success">
                        <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                        Ready
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={framework.id === "none" || assessingId === framework.id}
                      onClick={() => void handleAssess(framework.id)}
                    >
                      {assessingId === framework.id ? (
                        <>
                          <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
                          Assessing
                        </>
                      ) : (
                        <>
                          <TriangleAlert className="h-3.5 w-3.5" />
                          Run Assessment
                        </>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {loading && <p className="mt-3 text-sm text-[color:var(--text-ghost)]">Refreshing framework catalog...</p>}
        </CardContent>
      </Card>
    </div>
  );
}

function ScorePill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "warning" | "critical";
}) {
  return (
    <div className="rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--bg-card)] px-3 py-2 text-center">
      <p className="text-lg font-semibold">{value}</p>
      <div className="mt-1 flex justify-center">
        <Badge variant={tone}>{label}</Badge>
      </div>
    </div>
  );
}

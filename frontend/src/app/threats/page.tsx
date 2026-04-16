"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { AlertTriangle, BellRing, ShieldCheck } from "lucide-react";
import { api, type Alert } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ThreatsPage() {
  const [alerts, setAlerts] = React.useState<Alert[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<"all" | "critical" | "high" | "medium" | "low">("all");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAlerts();
      setAlerts(data);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const filtered = alerts.filter((a) => (filter === "all" ? true : a.severity.toLowerCase() === filter));

  async function acknowledge(id: number) {
    await api.acknowledgeAlert(id);
    await load();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Threat Operations Queue</CardTitle>
          <CardDescription>Real-time detections with triage and acknowledgement controls.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {(["all", "critical", "high", "medium", "low"] as const).map((level) => (
              <Button
                key={level}
                size="sm"
                variant={filter === level ? "default" : "secondary"}
                onClick={() => setFilter(level)}
              >
                {level}
              </Button>
            ))}
            <Button size="sm" variant="secondary" onClick={() => void load()}>
              Refresh
            </Button>
          </div>

          <div className="space-y-2">
            {(filtered.length > 0
              ? filtered
              : [
                  {
                    id: -1,
                    severity: "low",
                    alert_type: "system",
                    message: "No active threats. Monitoring remains in nominal state.",
                    timestamp: new Date().toISOString(),
                    acknowledged: true,
                    device_mac: null,
                  },
                ]
            ).map((alert) => (
              <motion.div
                key={alert.id}
                layout
                className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--bg-panel)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          alert.severity.toLowerCase() === "critical" || alert.severity.toLowerCase() === "high"
                            ? "critical"
                            : alert.severity.toLowerCase() === "medium"
                              ? "warning"
                              : "success"
                        }
                      >
                        {alert.severity}
                      </Badge>
                      <span className="text-xs uppercase tracking-[0.12em] text-[color:var(--text-ghost)]">
                        {alert.alert_type.replaceAll("_", " ")}
                      </span>
                    </div>
                    <p className="text-sm text-[color:var(--text-primary)]">{alert.message}</p>
                    <p className="text-xs text-[color:var(--text-ghost)]">
                      {new Date(alert.timestamp).toLocaleString()}
                    </p>
                  </div>
                  {alert.id > 0 ? (
                    <Button
                      size="sm"
                      variant={alert.acknowledged ? "secondary" : "default"}
                      onClick={() => void acknowledge(alert.id)}
                      disabled={alert.acknowledged}
                    >
                      {alert.acknowledged ? <ShieldCheck className="h-4 w-4" /> : <BellRing className="h-4 w-4" />}
                      {alert.acknowledged ? "Acknowledged" : "Acknowledge"}
                    </Button>
                  ) : (
                    <Badge variant="success">Nominal</Badge>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {loading && (
            <p className="text-sm text-[color:var(--text-ghost)] flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Updating threat queue...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Cpu, PlayCircle, ShieldCheck, ShieldOff, Sparkles } from "lucide-react";
import { api, type AttackSimulationResult, type Device } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function SimulatePage() {
  const [devices, setDevices] = React.useState<Device[]>([]);
  const [selectedMac, setSelectedMac] = React.useState<string>("");
  const [simulation, setSimulation] = React.useState<AttackSimulationResult | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [simulating, setSimulating] = React.useState(false);
  const [trusting, setTrusting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);

  const selectedDevice = React.useMemo(
    () => devices.find((device) => device.mac === selectedMac) ?? null,
    [devices, selectedMac]
  );

  const loadDevices = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getDevices();
      setDevices(data);
      if (!selectedMac && data.length > 0) {
        setSelectedMac(data[0].mac);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load devices");
    } finally {
      setLoading(false);
    }
  }, [selectedMac]);

  React.useEffect(() => {
    void loadDevices();
  }, [loadDevices]);

  React.useEffect(() => {
    if (!status) return;
    const timer = setTimeout(() => setStatus(null), 2600);
    return () => clearTimeout(timer);
  }, [status]);

  const runSimulation = React.useCallback(async () => {
    if (!selectedMac) {
      setError("Select a device to start the simulation.");
      return;
    }

    setSimulating(true);
    setError(null);
    setStatus(null);

    try {
      const result = await api.simulateAttack(selectedMac);
      setSimulation(result);
      setStatus("Simulation complete");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Simulation failed");
    } finally {
      setSimulating(false);
    }
  }, [selectedMac]);

  const trustSelectedDevice = React.useCallback(async () => {
    if (!selectedDevice || selectedDevice.is_trusted) {
      setStatus(selectedDevice?.is_trusted ? "Device is already trusted" : "Select a device first");
      return;
    }

    setTrusting(true);
    try {
      await api.trustDevice(selectedDevice.mac);
      await loadDevices();
      setStatus(`${selectedDevice.hostname || selectedDevice.ip} marked as trusted`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to trust device");
    } finally {
      setTrusting(false);
    }
  }, [loadDevices, selectedDevice]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Attack Simulation Lab</CardTitle>
          <CardDescription>
            Model potential lateral movement from any host and validate your containment playbook.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_220px_auto_auto]">
            <div className="space-y-2">
              <Label htmlFor="device-select">Compromised source device</Label>
              <Select value={selectedMac} onValueChange={setSelectedMac}>
                <SelectTrigger id="device-select">
                  <SelectValue placeholder="Choose source device" />
                </SelectTrigger>
                <SelectContent>
                  {devices.length > 0 ? (
                    devices.map((device) => (
                      <SelectItem key={device.mac} value={device.mac}>
                        {device.hostname || device.ip} · {device.ip}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="__none" disabled>
                      No devices discovered yet
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Source risk</Label>
              <div className="flex h-10 items-center rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--bg-panel)] px-3">
                {selectedDevice ? (
                  <Badge
                    variant={
                      selectedDevice.risk_score >= 70
                        ? "critical"
                        : selectedDevice.risk_score >= 40
                          ? "warning"
                          : "success"
                    }
                  >
                    {Math.round(selectedDevice.risk_score)}
                  </Badge>
                ) : (
                  <Badge variant="muted">Awaiting selection</Badge>
                )}
              </div>
            </div>

            <div className="flex items-end">
              <Button className="w-full" onClick={() => void runSimulation()} disabled={simulating || loading}>
                <PlayCircle className="h-4 w-4" />
                {simulating ? "Simulating..." : "Run Simulation"}
              </Button>
            </div>

            <div className="flex items-end">
              <Button
                className="w-full"
                variant="secondary"
                onClick={() => void trustSelectedDevice()}
                disabled={trusting || !selectedDevice}
              >
                {selectedDevice?.is_trusted ? <ShieldCheck className="h-4 w-4" /> : <ShieldOff className="h-4 w-4" />}
                {trusting ? "Saving..." : selectedDevice?.is_trusted ? "Trusted" : "Trust"}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--text-ghost)]">
            <Badge variant={loading ? "warning" : "success"}>{loading ? "Syncing inventory" : "Ready"}</Badge>
            <span>Simulations use current ports, trust status, CVEs, and topology edges.</span>
          </div>

          {error && <p className="text-sm text-[color:var(--status-critical)]">{error}</p>}
          {status && <p className="text-sm text-[color:var(--status-info)]">{status}</p>}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Lateral Movement Path</CardTitle>
            <CardDescription>
              {simulation
                ? `${simulation.steps.length} hop(s) identified from selected source.`
                : "Run a simulation to generate an attack path and exploit chain."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hop</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Risk</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(simulation?.steps.length
                  ? simulation.steps
                  : [
                      {
                        from_ip: "—",
                        from_host: "No simulation yet",
                        to_ip: "—",
                        to_host: "Select a source device",
                        method: "Run simulation",
                        risk: 0,
                      },
                    ]
                ).map((step, index) => (
                  <TableRow key={`${step.from_ip}-${step.to_ip}-${index}`}>
                    <TableCell className="font-mono text-xs">#{index + 1}</TableCell>
                    <TableCell>
                      <p className="font-medium">{step.from_host || "Unknown"}</p>
                      <p className="text-xs text-[color:var(--text-ghost)]">{step.from_ip}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{step.to_host || "Unknown"}</p>
                      <p className="text-xs text-[color:var(--text-ghost)]">{step.to_ip}</p>
                    </TableCell>
                    <TableCell className="text-[color:var(--text-secondary)]">{step.method}</TableCell>
                    <TableCell>
                      <Badge
                        variant={step.risk >= 70 ? "critical" : step.risk >= 40 ? "warning" : "success"}
                      >
                        {Math.round(step.risk)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Narration</CardTitle>
            <CardDescription>Explainability output generated from the simulation engine.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <motion.div
              layout
              className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--bg-panel)] p-4"
            >
              <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--text-ghost)]">Narrative summary</p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[color:var(--text-secondary)]">
                {simulation?.narration ||
                  "No simulation has been executed. Choose a source host and run simulation to receive an AI explanation of attack progression and impact."}
              </p>
            </motion.div>

            <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--bg-panel)] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--text-ghost)]">Response actions</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => void runSimulation()} disabled={simulating || !selectedMac}>
                  <Sparkles className="h-4 w-4" />
                  Re-run
                </Button>
                <Button variant="secondary" onClick={() => void loadDevices()} disabled={loading}>
                  <Cpu className="h-4 w-4" />
                  Refresh Inventory
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSimulation(null);
                    setStatus("Simulation panel reset");
                  }}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Clear
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-[color:var(--border-soft)] bg-[color:var(--bg-panel)] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--text-ghost)]">Attack chain</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                {simulation?.path?.length ? (
                  simulation.path.map((node, index) => (
                    <React.Fragment key={`${node}-${index}`}>
                      <Badge variant="muted">{node.slice(0, 10)}</Badge>
                      {index < simulation.path.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-[color:var(--text-ghost)]" />}
                    </React.Fragment>
                  ))
                ) : (
                  <span className="text-[color:var(--text-secondary)]">Chain appears here after simulation.</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

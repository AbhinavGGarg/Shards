"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Search, ShieldCheck, ShieldOff, SlidersHorizontal } from "lucide-react";
import { useNetworkData } from "@/hooks/useNetworkData";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function DevicesPage() {
  const { devices, loading, refresh } = useNetworkData();
  const [query, setQuery] = React.useState("");
  const [sortBy, setSortBy] = React.useState<"risk" | "hostname" | "ip">("risk");
  const [trustBusy, setTrustBusy] = React.useState<string | null>(null);

  const filtered = React.useMemo(() => {
    const q = query.toLowerCase();
    const matched = devices.filter(
      (d) =>
        d.ip.toLowerCase().includes(q) ||
        d.hostname.toLowerCase().includes(q) ||
        d.vendor.toLowerCase().includes(q) ||
        d.mac.toLowerCase().includes(q)
    );

    return matched.sort((a, b) => {
      if (sortBy === "risk") return b.risk_score - a.risk_score;
      if (sortBy === "hostname") return (a.hostname || "").localeCompare(b.hostname || "");
      return a.ip.localeCompare(b.ip);
    });
  }, [devices, query, sortBy]);

  async function markTrusted(mac: string) {
    setTrustBusy(mac);
    try {
      await api.trustDevice(mac);
      await refresh();
    } finally {
      setTrustBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Device Inventory</CardTitle>
          <CardDescription>Search, prioritize, and harden every monitored endpoint.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-[color:var(--text-ghost)]" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by host, IP, vendor, MAC"
                className="pl-9"
              />
            </div>
            <div className="w-full md:w-56">
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="risk">Sort: Risk</SelectItem>
                  <SelectItem value="hostname">Sort: Hostname</SelectItem>
                  <SelectItem value="ip">Sort: IP Address</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="secondary" onClick={() => void refresh()}>
              <SlidersHorizontal className="h-4 w-4" />
              Refresh
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Host</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Open Ports</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(filtered.length > 0
                ? filtered
                : [
                    {
                      mac: "empty",
                      ip: "No devices available",
                      hostname: "Run scan from dashboard",
                      vendor: "",
                      device_type: "",
                      open_ports: {},
                      risk_score: 0,
                      os: "",
                      services: {},
                      is_trusted: false,
                      is_flagged: false,
                      cves: [],
                      first_seen: "",
                      last_seen: "",
                    },
                  ]
              ).map((device) => (
                <motion.tr key={device.mac} layout>
                  <TableCell>
                    <p className="font-medium">{device.hostname || "Unknown host"}</p>
                    <p className="text-xs text-[color:var(--text-ghost)]">{device.mac}</p>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{device.ip}</TableCell>
                  <TableCell>{device.vendor || "Unknown"}</TableCell>
                  <TableCell>
                    <Badge variant="muted">{device.device_type || "n/a"}</Badge>
                  </TableCell>
                  <TableCell>{Object.keys(device.open_ports || {}).length}</TableCell>
                  <TableCell>
                    <Badge
                      variant={device.risk_score >= 70 ? "critical" : device.risk_score >= 40 ? "warning" : "success"}
                    >
                      {Math.round(device.risk_score)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {device.mac === "empty" ? (
                      <Badge variant="muted">Awaiting telemetry</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant={device.is_trusted ? "secondary" : "default"}
                        onClick={() => void markTrusted(device.mac)}
                        disabled={trustBusy === device.mac}
                      >
                        {device.is_trusted ? <ShieldCheck className="h-4 w-4" /> : <ShieldOff className="h-4 w-4" />}
                        {trustBusy === device.mac ? "Saving..." : device.is_trusted ? "Trusted" : "Trust"}
                      </Button>
                    )}
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>

          {loading && <p className="text-sm text-[color:var(--text-ghost)]">Refreshing device inventory…</p>}
        </CardContent>
      </Card>
    </div>
  );
}

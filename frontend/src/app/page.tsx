"use client";

import { useState, useEffect } from "react";
import { useNetworkData } from "@/hooks/useNetworkData";
import { useWebSocket } from "@/hooks/useWebSocket";
import type { TopologyNode } from "@/lib/api";
import NetworkGraph from "./components/NetworkGraph";
import DeviceDetailPanel from "./components/DeviceDetailPanel";
import ScanControls from "./components/ScanControls";
import TopologyStats from "./components/TopologyStats";

export default function DashboardPage() {
  const { topology, stats, loading, error, refresh } = useNetworkData();
  const { connected, on } = useWebSocket();
  const [selectedDevice, setSelectedDevice] = useState<TopologyNode | null>(null);
  const [newDeviceMacs, setNewDeviceMacs] = useState<Set<string>>(new Set());

  // Subscribe to real-time events
  useEffect(() => {
    const unsubs = [
      on("scan_complete", () => {
        refresh();
      }),
      on("device_joined", (data: unknown) => {
        const device = data as { mac: string };
        setNewDeviceMacs((prev) => new Set(prev).add(device.mac));
        // Clear pulse after 5 seconds
        setTimeout(() => {
          setNewDeviceMacs((prev) => {
            const next = new Set(prev);
            next.delete(device.mac);
            return next;
          });
        }, 5000);
        refresh();
      }),
      on("device_left", () => {
        refresh();
      }),
      on("port_change", () => {
        refresh();
      }),
      on("alert", () => {
        refresh();
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [on, refresh]);

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-6">
      <div className="flex-1 flex flex-col gap-6 min-w-0">
        <div className="flex items-end justify-between">
          <div>
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "0.16em",
                color: "var(--text-ghost)",
                marginBottom: "6px",
              }}
            >
              Surveillance ▸ Live
            </p>
            <div className="flex items-center gap-3">
              <h2
                style={{
                  fontFamily: "var(--font-sans)",
                  fontWeight: 700,
                  fontSize: "32px",
                  letterSpacing: "-0.02em",
                  color: "var(--text-primary)",
                }}
              >
                Network Dashboard
              </h2>
              <span
                className="w-2 h-2 rounded-full"
                title={connected ? "WebSocket connected" : "WebSocket disconnected"}
                style={{
                  backgroundColor: connected ? "var(--status-healthy)" : "var(--status-critical)",
                }}
              />
            </div>
          </div>
          <ScanControls
            onScanComplete={refresh}
            deviceCount={topology?.nodes.length ?? 0}
          />
        </div>

        <TopologyStats stats={stats} loading={loading} />

        {error && (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{
              background: "color-mix(in srgb, var(--status-critical) 12%, transparent)",
              border: "1px solid color-mix(in srgb, var(--status-critical) 35%, transparent)",
            }}
          >
            <span style={{ color: "var(--status-critical)", fontSize: "16px" }}>◆</span>
            <div className="flex-1 min-w-0">
              <p
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  color: "var(--status-critical)",
                }}
              >
                Backend unreachable
              </p>
              <p
                className="mt-1"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  color: "var(--text-secondary)",
                }}
              >
                {error}
              </p>
            </div>
            <button onClick={refresh} className="frag-btn-secondary">
              Retry
            </button>
          </div>
        )}

        <div className="flex-1">
          <NetworkGraph
            data={topology}
            onNodeClick={(node) => setSelectedDevice(node)}
            pulsingNodes={newDeviceMacs}
          />
        </div>
      </div>

      {selectedDevice && (
        <DeviceDetailPanel
          device={selectedDevice}
          onClose={() => setSelectedDevice(null)}
        />
      )}
    </div>
  );
}

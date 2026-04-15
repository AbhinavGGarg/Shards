"use client";

import type { TopologyNode } from "@/lib/api";
import RiskScoreBadge from "./RiskScoreBadge";

interface DeviceDetailPanelProps {
  device: TopologyNode | null;
  onClose: () => void;
}

export default function DeviceDetailPanel({ device, onClose }: DeviceDetailPanelProps) {
  if (!device) return null;

  const ports = Object.entries(device.open_ports || {});

  return (
    <div
      className="w-80 overflow-y-auto h-full"
      style={{
        background: "var(--bg-card)",
        borderLeft: "1px solid color-mix(in srgb, var(--bg-border) 40%, transparent)",
      }}
    >
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{
          borderBottom: "1px solid color-mix(in srgb, var(--bg-border) 30%, transparent)",
        }}
      >
        <h3
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 600,
            fontSize: "13px",
            color: "var(--text-primary)",
          }}
        >
          {device.hostname || device.ip}
        </h3>
        <button
          onClick={onClose}
          className="rounded-md"
          style={{
            color: "var(--text-ghost)",
            background: "var(--bg-elevated)",
            padding: "4px 9px",
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
          }}
        >
          ✕
        </button>
      </div>
      <div className="p-5 space-y-5">
        <RiskScoreBadge score={device.risk_score} size="lg" />

        <InfoRow label="IP Address" value={device.ip} mono />
        <InfoRow label="MAC" value={device.id} mono />
        <InfoRow label="Hostname" value={device.hostname || "—"} />
        <InfoRow label="Vendor" value={device.vendor || "Unknown"} />
        <InfoRow label="Type" value={device.device_type} />

        {ports.length > 0 && (
          <div>
            <p className="frag-label mb-2">Open Ports</p>
            <div className="space-y-1">
              {ports.map(([port, service]) => (
                <div
                  key={port}
                  className="flex justify-between px-3 py-2 rounded-md"
                  style={{
                    background: "var(--black)",
                    border: "1px solid color-mix(in srgb, var(--bg-border) 30%, transparent)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "12px",
                  }}
                >
                  <span style={{ color: "var(--orange)", fontWeight: 600 }}>{port}</span>
                  <span style={{ color: "var(--text-secondary)" }}>{service}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="frag-label">{label}</p>
      <p
        style={{
          marginTop: "4px",
          fontFamily: mono ? "var(--font-mono)" : "var(--font-sans)",
          fontSize: "13px",
          color: "var(--text-primary)",
        }}
      >
        {value}
      </p>
    </div>
  );
}

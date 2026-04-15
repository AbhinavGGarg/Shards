"use client";

import { useState } from "react";
import { api } from "@/lib/api";

interface ScanControlsProps {
  onScanComplete: () => void;
  deviceCount: number;
}

export default function ScanControls({ onScanComplete, deviceCount }: ScanControlsProps) {
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState<"idle" | "scanning" | "complete">("idle");

  async function handleScan() {
    setScanning(true);
    setStatus("scanning");
    try {
      await api.triggerScan();
      setStatus("complete");
      onScanComplete();
    } catch {
      setStatus("idle");
    } finally {
      setScanning(false);
    }
  }

  const dotColor =
    status === "scanning"
      ? "var(--status-warning)"
      : status === "complete"
        ? "var(--status-healthy)"
        : "var(--text-ghost)";

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={handleScan}
        disabled={scanning}
        className={scanning ? "frag-btn-ghost" : "frag-btn-primary"}
      >
        {scanning ? "Scanning…" : "Scan Network"}
      </button>
      <div
        className="flex items-center gap-2"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "var(--text-secondary)",
        }}
      >
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: dotColor }}
        />
        {status === "scanning" && "Scanning network…"}
        {status === "complete" && `Found ${deviceCount} devices`}
        {status === "idle" && "Ready"}
      </div>
    </div>
  );
}

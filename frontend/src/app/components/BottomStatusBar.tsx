"use client";

import { useEffect, useState } from "react";
import { getRuntimeApiBase } from "@/lib/api";

type ScanStatus = {
  scanning: boolean;
  last_scan: string | null;
  device_count: number;
  alert_count: number;
};

export default function BottomStatusBar() {
  const [status, setStatus] = useState<ScanStatus>({
    scanning: false,
    last_scan: null,
    device_count: 0,
    alert_count: 0,
  });

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const [devRes, alertRes] = await Promise.all([
          fetch(`${getRuntimeApiBase()}/api/devices`),
          fetch(`${getRuntimeApiBase()}/api/alerts`),
        ]);
        if (devRes.ok && alertRes.ok) {
          const devices = await devRes.json();
          const alerts = await alertRes.json();
          setStatus((s) => ({
            ...s,
            device_count: Array.isArray(devices) ? devices.length : 0,
            alert_count: Array.isArray(alerts) ? alerts.length : 0,
          }));
        }
      } catch {
        /* noop */
      }
    };
    fetchStatus();
    const t = setInterval(fetchStatus, 5000);
    return () => clearInterval(t);
  }, []);

  const triggerScan = async () => {
    setStatus((s) => ({ ...s, scanning: true }));
    try {
      await fetch(`${getRuntimeApiBase()}/api/scan`, { method: "POST" });
    } catch {
      /* noop */
    } finally {
      setTimeout(() => setStatus((s) => ({ ...s, scanning: false })), 2000);
    }
  };

  return (
    <footer
      className="h-14 flex items-center justify-between px-8 flex-shrink-0"
      style={{
        background: "var(--bg-sidebar)",
        borderTop: "1px solid color-mix(in srgb, var(--bg-border) 30%, transparent)",
      }}
    >
      <div className="flex items-center gap-6">
        <div className="relative flex items-center justify-center w-6 h-6">
          <span
            className="absolute inset-0 rounded-full radar-pulse"
            style={{ background: "color-mix(in srgb, var(--orange) 40%, transparent)" }}
          />
          <span
            className="relative w-2 h-2 rounded-full"
            style={{ background: "var(--orange)" }}
          />
        </div>
        <div className="flex items-center gap-1.5 text-[11px]" style={{ fontFamily: "var(--font-mono)", color: "var(--text-ghost)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
            lan
          </span>
          <span style={{ color: "var(--text-secondary)" }}>{status.device_count} devices</span>
          <span className="mx-2">·</span>
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
            shield
          </span>
          <span style={{ color: "var(--text-secondary)" }}>{status.alert_count} alerts</span>
        </div>
      </div>

      <button
        onClick={triggerScan}
        disabled={status.scanning}
        className="accent-gradient flex items-center gap-2 px-5 py-2 rounded-full text-white font-semibold text-xs uppercase disabled:opacity-60"
        style={{ letterSpacing: "0.12em" }}
      >
        <span
          className={`material-symbols-outlined ${status.scanning ? "animate-spin" : ""}`}
          style={{ fontSize: 16 }}
        >
          {status.scanning ? "progress_activity" : "radar"}
        </span>
        {status.scanning ? "Scanning…" : "Scan Network"}
      </button>
    </footer>
  );
}

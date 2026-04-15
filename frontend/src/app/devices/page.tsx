"use client";

import { useState, useMemo } from "react";
import { useNetworkData } from "@/hooks/useNetworkData";
import RiskScoreBadge from "../components/RiskScoreBadge";

export default function DevicesPage() {
  const { devices, loading } = useNetworkData();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"risk_score" | "ip" | "hostname">("risk_score");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const results = devices.filter(
      (d) =>
        d.ip.includes(q) ||
        d.hostname.toLowerCase().includes(q) ||
        d.vendor.toLowerCase().includes(q) ||
        d.mac.toLowerCase().includes(q)
    );
    return results.sort((a, b) => {
      if (sortBy === "risk_score") return b.risk_score - a.risk_score;
      return (a[sortBy] || "").localeCompare(b[sortBy] || "");
    });
  }, [devices, search, sortBy]);

  return (
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
        Inventory
      </p>
      <h2
        style={{
          fontFamily: "var(--font-sans)",
          fontWeight: 700,
          fontSize: "32px",
          letterSpacing: "-0.02em",
          marginBottom: "24px",
        }}
      >
        Device Inventory
      </h2>

      <div className="flex gap-3 mb-5">
        <input
          type="text"
          placeholder="Search by IP, hostname, vendor, or MAC…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="frag-input flex-1"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="frag-input"
          style={{ paddingRight: "32px" }}
        >
          <option value="risk_score">Sort by Risk</option>
          <option value="ip">Sort by IP</option>
          <option value="hostname">Sort by Hostname</option>
        </select>
      </div>

      {loading ? (
        <p style={{ color: "var(--text-ghost)", fontFamily: "var(--font-mono)", fontSize: "12px" }}>
          Loading…
        </p>
      ) : (
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "var(--bg-card)",
            border: "1px solid color-mix(in srgb, var(--bg-border) 30%, transparent)",
          }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--black)" }}>
                {["IP", "Hostname", "Vendor", "Type", "OS", "Ports", "Risk"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "10px",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                      color: "var(--text-ghost)",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((device) => (
                <tr
                  key={device.mac}
                  style={{
                    borderTop: "1px solid color-mix(in srgb, var(--bg-border) 25%, transparent)",
                  }}
                >
                  <td
                    className="px-4 py-3"
                    style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--orange)" }}
                  >
                    {device.ip}
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--text-primary)" }}>
                    {device.hostname || "—"}
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>
                    {device.vendor || "Unknown"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="rounded-md"
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "10px",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        padding: "3px 8px",
                        background: "var(--bg-elevated)",
                        color: "var(--text-secondary)",
                        border: "1px solid color-mix(in srgb, var(--bg-border) 40%, transparent)",
                      }}
                    >
                      {device.device_type}
                    </span>
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>
                    {device.os || "—"}
                  </td>
                  <td
                    className="px-4 py-3"
                    style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-ghost)" }}
                  >
                    {Object.keys(device.open_ports).length}
                  </td>
                  <td className="px-4 py-3">
                    <RiskScoreBadge score={device.risk_score} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p
              className="p-8 text-center"
              style={{
                color: "var(--text-ghost)",
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
              }}
            >
              {devices.length === 0 ? "No devices discovered yet." : "No devices match your search."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

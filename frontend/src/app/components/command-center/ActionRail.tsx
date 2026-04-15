"use client";

interface ActionRailProps {
  onIsolate: () => void;
  onBlockIp: () => void;
  onDeepScan: () => void;
  deepScanRunning: boolean;
  targetLabel: string;
}

export default function ActionRail({
  onIsolate,
  onBlockIp,
  onDeepScan,
  deepScanRunning,
  targetLabel,
}: ActionRailProps) {
  return (
    <section className="command-panel p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="command-kicker">Action System</p>
          <h3 className="text-base font-semibold mt-1">Live Response Controls · target {targetLabel}</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={onIsolate} className="command-btn">
            <span className="material-symbols-outlined">lan_disconnect</span>
            Isolate Device
          </button>
          <button
            onClick={onBlockIp}
            className="command-btn"
            style={{
              color: "var(--status-critical)",
              borderColor: "color-mix(in srgb, var(--status-critical) 40%, transparent)",
              background: "color-mix(in srgb, var(--status-critical) 12%, transparent)",
            }}
          >
            <span className="material-symbols-outlined">gpp_bad</span>
            Block IP
          </button>
          <button
            onClick={onDeepScan}
            className="command-btn command-btn-primary"
            disabled={deepScanRunning}
          >
            <span className={`material-symbols-outlined ${deepScanRunning ? "animate-spin" : ""}`}>
              {deepScanRunning ? "progress_activity" : "radar"}
            </span>
            {deepScanRunning ? "Running Deep Scan" : "Run Deep Scan"}
          </button>
        </div>
      </div>
    </section>
  );
}

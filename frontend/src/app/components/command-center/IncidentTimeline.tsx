"use client";

import type { TimelineEvent } from "./types";

interface IncidentTimelineProps {
  events: TimelineEvent[];
}

const severityColor: Record<TimelineEvent["severity"], string> = {
  critical: "var(--status-critical)",
  high: "var(--status-critical)",
  medium: "var(--status-warning)",
  low: "var(--status-healthy)",
  info: "var(--status-info)",
};

export default function IncidentTimeline({ events }: IncidentTimelineProps) {
  return (
    <section className="command-panel p-4 lg:p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="command-kicker">Incident Timeline</p>
          <h3 className="text-lg font-semibold mt-1">Chronological Security Events</h3>
        </div>
        <span className="command-pill command-pill-info">Live stream</span>
      </div>

      <div className="mt-4 max-h-56 overflow-auto pr-1">
        <ul className="space-y-2">
          {events.map((event) => {
            const color = severityColor[event.severity];
            return (
              <li key={event.id} className="command-list-row" style={{ alignItems: "flex-start" }}>
                <span className="mt-2 w-2.5 h-2.5 rounded-full alert-dot" style={{ background: color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="command-event-type">{event.type}</span>
                    <p className="text-sm font-medium">{event.title}</p>
                  </div>
                  <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                    {event.detail}
                  </p>
                </div>
                <span className="text-[11px]" style={{ color: "var(--text-ghost)", fontFamily: "var(--font-mono)" }}>
                  {new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

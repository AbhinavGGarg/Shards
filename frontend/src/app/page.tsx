"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronRight,
  Eye,
  Network,
  Radar,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import ShardsLogo from "./components/ShardsLogo";
import { writeSession } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const featureCards = [
  {
    icon: Radar,
    title: "Real-time Threat Detection",
    description: "Continuously ingest telemetry and identify anomalies before they escalate into incidents.",
  },
  {
    icon: Bot,
    title: "AI-Powered Analysis",
    description: "Use AI-assisted reasoning to explain detections and prioritize high-impact response actions.",
  },
  {
    icon: Network,
    title: "Full Device Visibility",
    description: "Map every endpoint, surface exposed ports, and monitor posture drift across your network graph.",
  },
  {
    icon: Zap,
    title: "Automated Response",
    description: "Trigger isolation, block policies, and deep scans from one operational command surface.",
  },
];

const steps = [
  {
    title: "Connect your network",
    description: "Link your environment and begin collecting secure telemetry in minutes.",
  },
  {
    title: "Monitor threats",
    description: "Track incidents, vulnerable assets, and anomaly trends in real time.",
  },
  {
    title: "Respond with AI",
    description: "Execute guided containment and remediation actions with confidence.",
  },
];

export default function LandingPage() {
  const router = useRouter();

  const openDemo = React.useCallback(() => {
    writeSession({
      email: "demo@shards.app",
      name: "Demo Analyst",
      role: "analyst",
      loginAt: new Date().toISOString(),
    });
    router.push("/dashboard");
  }, [router]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[color:var(--bg-deep)] text-[color:var(--text-primary)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_-10%,rgba(42,216,255,0.2),transparent_36%),radial-gradient(circle_at_88%_8%,rgba(255,80,101,0.15),transparent_34%)]" />

      <header className="relative z-10 border-b border-white/10 bg-[color:var(--bg-deep)]/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center">
            <ShardsLogo size={34} variant="wordmark-accent" />
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => router.push("/auth")}>Sign In</Button>
            <Button onClick={() => router.push("/auth")}>Get Started</Button>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto grid max-w-[1240px] gap-8 px-4 pb-14 pt-14 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:px-8 lg:pb-20 lg:pt-20">
          <div>
            <Badge variant="default" className="mb-4">AI Security Operations Platform</Badge>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              Shards
            </h1>
            <p className="mt-4 text-xl font-medium text-[color:var(--status-info)]">
              AI-powered network security and threat intelligence
            </p>
            <p className="mt-4 max-w-xl text-base leading-7 text-[color:var(--text-secondary)] sm:text-lg">
              Monitor, detect, and respond to threats in real time with a unified cyber defense workspace designed for fast-moving security teams.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button size="lg" onClick={() => router.push("/auth")}>
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="secondary" onClick={openDemo}>
                <Eye className="h-4 w-4" />
                View Demo
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4 text-sm text-[color:var(--text-ghost)]">
              <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-[color:var(--status-healthy)]" /> SOC ready</span>
              <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-[color:var(--status-healthy)]" /> Enterprise architecture</span>
              <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-[color:var(--status-healthy)]" /> Real-time telemetry</span>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="rounded-2xl border border-white/10 bg-[linear-gradient(160deg,rgba(13,21,36,0.96),rgba(7,12,21,0.98))] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.42)]"
          >
            <p className="mb-3 text-xs uppercase tracking-[0.14em] text-[color:var(--text-ghost)]">Product Preview</p>
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <PreviewStat label="Risk score" value="24.8" tone="warning" />
                <PreviewStat label="Active alerts" value="6" tone="critical" />
                <PreviewStat label="Protected assets" value="182" tone="success" />
              </div>
              <div className="rounded-xl border border-white/10 bg-[#0a1220] p-3">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium">Incident Spotlight</p>
                  <Badge variant="critical">high</Badge>
                </div>
                <p className="text-sm text-[color:var(--text-secondary)]">
                  Suspicious lateral movement detected between `gateway` and `db-prod`.
                </p>
                <div className="mt-3 flex gap-2">
                  <button className="rounded-md border border-[color:var(--status-critical)]/40 px-2.5 py-1 text-xs text-[color:var(--status-critical)]">Isolate</button>
                  <button className="rounded-md border border-[color:var(--status-info)]/40 px-2.5 py-1 text-xs text-[color:var(--status-info)]">Run Deep Scan</button>
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#0a1220] p-3">
                <p className="mb-2 text-xs uppercase tracking-[0.14em] text-[color:var(--text-ghost)]">Threat stream</p>
                <div className="space-y-2 text-sm">
                  <PreviewEvent severity="critical" text="Credential relay pattern detected" />
                  <PreviewEvent severity="warning" text="New unmanaged endpoint discovered" />
                  <PreviewEvent severity="success" text="Policy sync completed" />
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        <section className="mx-auto max-w-[1240px] px-4 pb-12 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold tracking-tight">Core capabilities</h2>
          <p className="mt-2 max-w-2xl text-sm text-[color:var(--text-secondary)]">
            Built for high-stakes environments where speed, visibility, and confidence matter.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {featureCards.map((feature) => (
              <motion.article
                key={feature.title}
                whileHover={{ y: -2 }}
                className="rounded-xl border border-white/10 bg-[color:var(--bg-card)] p-4"
              >
                <Badge variant="default"><feature.icon className="h-3.5 w-3.5" /></Badge>
                <h3 className="mt-3 text-base font-medium">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[color:var(--text-secondary)]">{feature.description}</p>
              </motion.article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-[1240px] px-4 pb-14 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-white/10 bg-[color:var(--bg-card)] p-6">
            <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {steps.map((step, index) => (
                <div key={step.title} className="rounded-xl border border-white/10 bg-[color:var(--bg-panel)] p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--text-ghost)]">Step {index + 1}</p>
                  <h3 className="mt-2 text-lg font-medium">{step.title}</h3>
                  <p className="mt-2 text-sm text-[color:var(--text-secondary)]">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1240px] px-4 pb-20 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-[color:var(--status-info)]/25 bg-[linear-gradient(120deg,rgba(42,216,255,0.1),rgba(13,20,32,0.96))] p-6 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-2xl font-semibold">Start Securing Your Network</h2>
              <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
                Launch Shards and move from passive monitoring to proactive defense.
              </p>
            </div>
            <Button size="lg" onClick={() => router.push("/auth")}>
              Start Securing Your Network
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}

function PreviewStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "critical" | "warning" | "success";
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0a1220] p-3">
      <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--text-ghost)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      <div className="mt-2">
        <Badge variant={tone}>{tone}</Badge>
      </div>
    </div>
  );
}

function PreviewEvent({ severity, text }: { severity: "critical" | "warning" | "success"; text: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-2">
      <span className="text-xs text-[color:var(--text-secondary)]">{text}</span>
      <Badge variant={severity}>{severity}</Badge>
    </div>
  );
}

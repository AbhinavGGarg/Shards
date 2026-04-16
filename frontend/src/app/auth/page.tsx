"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import ShardsLogo from "@/app/components/ShardsLogo";
import { readSession, writeSession } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/dashboard";

  const [name, setName] = React.useState("Security Analyst");
  const [email, setEmail] = React.useState("analyst@shards.app");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const existing = readSession();
    if (!existing) return;
    router.replace(nextPath);
  }, [nextPath, router]);

  const completeSignIn = React.useCallback(
    async (role: "owner" | "analyst" | "viewer") => {
      if (!email.trim()) return;
      setLoading(true);

      const finalName = name.trim() || "Security Analyst";
      writeSession({
        name: finalName,
        email: email.trim(),
        role,
        loginAt: new Date().toISOString(),
      });

      await new Promise((resolve) => setTimeout(resolve, 450));
      router.push(nextPath);
    },
    [email, name, nextPath, router]
  );

  return (
    <div className="min-h-screen bg-[color:var(--bg-deep)] text-[color:var(--text-primary)]">
      <div className="mx-auto grid min-h-screen max-w-[1100px] gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_1fr] lg:items-center lg:px-8">
        <div className="space-y-5">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-[color:var(--text-secondary)] hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Back to homepage
          </Link>

          <ShardsLogo size={38} variant="wordmark-accent" />
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Secure Workspace Entry</h1>
          <p className="max-w-md text-sm leading-7 text-[color:var(--text-secondary)] sm:text-base">
            Authenticate into Shards to access live telemetry, threat operations, and AI-assisted response controls.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-[color:var(--bg-card)] p-4">
              <Badge variant="success"><ShieldCheck className="h-3.5 w-3.5" /></Badge>
              <p className="mt-3 text-sm font-medium">Session encryption</p>
              <p className="mt-1 text-xs text-[color:var(--text-ghost)]">All access tokens are secured for this simulated workspace.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-[color:var(--bg-card)] p-4">
              <Badge variant="default"><Sparkles className="h-3.5 w-3.5" /></Badge>
              <p className="mt-3 text-sm font-medium">AI readiness</p>
              <p className="mt-1 text-xs text-[color:var(--text-ghost)]">Immediately route into the command dashboard after sign-in.</p>
            </div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="rounded-2xl border border-white/10 bg-[color:var(--bg-card)] p-6 shadow-[0_20px_48px_rgba(0,0,0,0.42)]"
        >
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-medium">Sign in to Shards</h2>
            <Badge variant="default"><LockKeyhole className="h-3.5 w-3.5" /></Badge>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
              />
            </div>
          </div>

          <div className="mt-6 grid gap-2">
            <Button onClick={() => void completeSignIn("analyst")} disabled={loading}>
              {loading ? "Authenticating..." : "Continue as Analyst"}
            </Button>
            <Button variant="secondary" onClick={() => void completeSignIn("owner")} disabled={loading}>
              Continue as Admin
            </Button>
            <Button variant="ghost" onClick={() => void completeSignIn("viewer")} disabled={loading}>
              View Demo Workspace
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

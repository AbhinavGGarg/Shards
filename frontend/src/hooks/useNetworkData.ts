"use client";

import { useState, useEffect, useCallback } from "react";
import { api, type Device, type TopologyData, type Stats } from "@/lib/api";

export function useNetworkData() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [topology, setTopology] = useState<TopologyData | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [d, t, s] = await Promise.all([
        api.getDevices(),
        api.getTopology(),
        api.getStats(),
      ]);
      setDevices(d);
      setTopology(t);
      setStats(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { devices, topology, stats, loading, error, refresh };
}

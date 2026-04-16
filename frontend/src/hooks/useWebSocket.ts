"use client";

import { useEffect, useRef, useState, useCallback } from "react";

function resolveWsUrl(): string {
  const configured = process.env.NEXT_PUBLIC_WS_URL?.trim();

  if (typeof window !== "undefined") {
    const host = window.location.hostname.toLowerCase();
    if (host.endsWith(".vercel.app")) {
      const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      return `${protocol}://${window.location.host}/_/backend/ws`;
    }
  }

  if (configured && !configured.includes("<your-vercel-domain>")) {
    return configured;
  }

  return "ws://localhost:8000/ws";
}

export interface WSEvent {
  event: string;
  data: unknown;
}

type EventHandler = (data: unknown) => void;

export function useWebSocket() {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Map<string, EventHandler[]>>(new Map());
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(resolveWsUrl());
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);

    ws.onclose = () => {
      setConnected(false);
      reconnectRef.current = setTimeout(connect, 3000);
    };

    ws.onmessage = (msg) => {
      try {
        const parsed: WSEvent = JSON.parse(msg.data);
        const handlers = handlersRef.current.get(parsed.event) || [];
        handlers.forEach((h) => h(parsed.data));
      } catch {
        // ignore malformed messages
      }
    };
  }, []);

  const on = useCallback((event: string, handler: EventHandler) => {
    const existing = handlersRef.current.get(event) || [];
    handlersRef.current.set(event, [...existing, handler]);
    return () => {
      const list = handlersRef.current.get(event) || [];
      handlersRef.current.set(event, list.filter((h) => h !== handler));
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { connected, on };
}

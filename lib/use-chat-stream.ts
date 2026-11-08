"use client";

import { useCallback, useEffect, useState } from "react";
import type { ChatSnapshot } from "./chat-types";
import { api } from "./api";

export function useChatStream(conversationId?: string, inboxLimit = 20) {
  const [snapshot, setSnapshot] = useState<ChatSnapshot>();
  const [status, setStatus] = useState<
    "connecting" | "live" | "polling" | "reconnecting" | "error"
  >("connecting");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  useEffect(() => {
    setStatus("connecting");
    setError("");
    const params = new URLSearchParams({ limit: String(inboxLimit) });
    if (conversationId) params.set("conversation", conversationId);
    const source = new EventSource(`/api/chat/stream?${params}`);
    let received = false;
    let live = false;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let pending = false;
    const controller = new AbortController();
    function schedule() {
      clearTimeout(timer);
      if (!disposed && !live) timer = setTimeout(() => void refresh(), 5000);
    }
    async function refresh() {
      if (pending || disposed || live) return;
      pending = true;
      const result = await api<ChatSnapshot>(`/chat/snapshot?${params}`, {
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(12000),
        ]),
      });
      pending = false;
      if (disposed || live) return;
      if (result.ok) {
        setSnapshot(result.data);
        received = true;
        setStatus("polling");
        setError("");
      } else {
        setStatus(received ? "reconnecting" : "error");
        setError(result.error);
        if ([401, 403, 404].includes(result.status)) {
          setSnapshot(undefined);
          source.close();
          return;
        }
      }
      schedule();
    }
    // Load the inbox without waiting for a WebSocket bridge to establish itself.
    // If live updates are blocked, the same authorized query keeps it usable.
    void refresh();
    source.addEventListener("snapshot", (event: MessageEvent<string>) => {
      try {
        const next: ChatSnapshot = JSON.parse(event.data);
        setSnapshot(next);
        received = true;
        live = true;
        clearTimeout(timer);
        setStatus("live");
        setError("");
      } catch {
        live = false;
        source.close();
        void refresh();
      }
    });
    source.addEventListener("connection", (event: MessageEvent<string>) => {
      try {
        const state: { connected: boolean } = JSON.parse(event.data);
        if (!state.connected) {
          live = false;
          void refresh();
        }
      } catch {
        live = false;
        void refresh();
      }
    });
    source.addEventListener("unavailable", () => {
      live = false;
      source.close();
      void refresh();
    });
    source.onerror = () => {
      live = false;
      void refresh();
    };
    return () => {
      disposed = true;
      clearTimeout(timer);
      controller.abort();
      source.close();
    };
  }, [conversationId, inboxLimit, attempt]);
  return { snapshot, status, error, retry };
}

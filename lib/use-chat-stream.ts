"use client";

import { useCallback, useEffect, useState } from "react";
import type { ChatSnapshot } from "./chat-types";

export function useChatStream(conversationId?: string, inboxLimit = 20) {
  const [snapshot, setSnapshot] = useState<ChatSnapshot>();
  const [status, setStatus] = useState<
    "connecting" | "live" | "reconnecting" | "error"
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
    source.addEventListener("snapshot", (event: MessageEvent<string>) => {
      try {
        const next: ChatSnapshot = JSON.parse(event.data);
        setSnapshot(next);
        received = true;
        setStatus("live");
        setError("");
      } catch {
        setStatus("error");
        setError("Messages could not be loaded. Reconnect to try again.");
        source.close();
      }
    });
    source.addEventListener("connection", (event: MessageEvent<string>) => {
      const state: { connected: boolean } = JSON.parse(event.data);
      setStatus(state.connected && received ? "live" : "reconnecting");
    });
    source.addEventListener("unavailable", () => {
      setSnapshot(undefined);
      setStatus("error");
      setError(
        "Conversation unavailable. Sign in again or return to your inbox.",
      );
      source.close();
    });
    source.onerror = () => {
      if (source.readyState === EventSource.CLOSED) {
        setStatus("error");
        setError(
          "Messages could not connect. Check your connection and sign-in, then retry.",
        );
      } else {
        setStatus("reconnecting");
      }
    };
    return () => source.close();
  }, [conversationId, inboxLimit, attempt]);
  return { snapshot, status, error, retry };
}

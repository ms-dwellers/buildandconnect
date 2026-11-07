"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isRecord, redact } from "./requests.ts";

export type DebugResult = {
  id: string;
  title: string;
  method: string;
  path: string;
  status: number | null;
  duration: number;
  data: unknown;
  cacheControl: string | null;
};
export type AccountState = {
  state: "loading" | "signed-out" | "signed-in" | "unavailable";
  name?: string;
  id?: string;
  role?: string | null;
};
type Call = { path: string; method: string; body?: string };

export function useDebugApi() {
  const [account, setAccount] = useState<AccountState>({ state: "loading" });
  const [health, setHealth] = useState<"loading" | "up" | "down">("loading");
  const [history, setHistory] = useState<DebugResult[]>([]);
  const [result, setResult] = useState<DebugResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const refreshSequence = useRef(0);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    const sequence = ++refreshSequence.current;
    const requestSignal = AbortSignal.any([
      AbortSignal.timeout(10_000),
      ...(signal ? [signal] : []),
    ]);
    const [me, healthResponse] = await Promise.allSettled([
      fetch("/api/me", {
        credentials: "same-origin",
        cache: "no-store",
        signal: requestSignal,
      }),
      fetch("/api/health", { cache: "no-store", signal: requestSignal }),
    ]);
    if (signal?.aborted || sequence !== refreshSequence.current) return;
    setHealth(
      healthResponse.status === "fulfilled" && healthResponse.value.ok
        ? "up"
        : "down",
    );
    if (me.status === "fulfilled" && me.value.status === 401) {
      setAccount({ state: "signed-out" });
    } else if (me.status === "fulfilled" && me.value.ok) {
      try {
        const data: unknown = await me.value.json();
        if (signal?.aborted || sequence !== refreshSequence.current) return;
        if (
          !isRecord(data) ||
          !isRecord(data.user) ||
          typeof data.user.id !== "string" ||
          typeof data.user.name !== "string"
        )
          throw new Error();
        setAccount({
          state: "signed-in",
          id: data.user.id,
          name: data.user.name,
          role: typeof data.role === "string" ? data.role : null,
        });
      } catch {
        setAccount({ state: "unavailable" });
      }
    } else {
      setAccount({ state: "unavailable" });
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  async function send(call: Call, title: string, secrets: string[] = []) {
    const start = performance.now();
    let status: number | null = null;
    let cacheControl: string | null = null;
    let data: unknown;
    try {
      const response = await fetch(call.path, {
        method: call.method,
        body: call.body,
        credentials: "same-origin",
        cache: "no-store",
        headers:
          call.body === undefined
            ? undefined
            : { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(65_000),
      });
      status = response.status;
      cacheControl = response.headers.get("Cache-Control");
      if (response.headers.get("Content-Type")?.includes("application/json")) {
        data = redact(await response.json(), secrets);
      } else {
        data = {
          error:
            "The server returned a non-JSON response. Inspect the browser Network panel for details.",
        };
      }
    } catch {
      data = {
        error:
          "Request failed or timed out. Check the server and Network panel. A timed-out write may still have completed; check its state before retrying.",
      };
    }
    const entry: DebugResult = {
      id: crypto.randomUUID(),
      title,
      path: call.path,
      method: call.method,
      status,
      duration: Math.round(performance.now() - start),
      data,
      cacheControl,
    };
    setHistory((previous) => [entry, ...previous].slice(0, 10));
    setResult(entry);
    return entry;
  }

  async function run(task: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await task();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to send the request.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  function clearHistory() {
    setHistory([]);
    setResult(null);
  }

  return {
    account,
    health,
    history,
    result,
    busy,
    error,
    refresh,
    send,
    run,
    setResult,
    clearHistory,
    clearError: () => setError(""),
  };
}

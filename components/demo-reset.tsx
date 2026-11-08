"use client";

import { useEffect } from "react";
import { api } from "@/lib/api";
import { createDemoResetSequence } from "@/lib/demo-reset";
import { useSession } from "@/lib/session";
import { SESSION_MEMORY_KEY } from "@/lib/theme-boot";
import { toastManager } from "@/components/ui/toast";

type ResetStatus = { enabled: boolean; generation: number };
const generationKey = "bandc.demo-generation";

function rememberedGeneration() {
  try {
    const value = localStorage.getItem(generationKey);
    return value === null ? null : Number(value);
  } catch {
    return null;
  }
}

function rememberGeneration(generation: number) {
  try {
    localStorage.setItem(generationKey, String(generation));
  } catch {
    // Server sessions are revoked even when browser storage is unavailable.
  }
}

export function DemoReset() {
  const { signOut } = useSession();

  useEffect(() => {
    const detect = createDemoResetSequence();
    let generation = rememberedGeneration();
    let busy = false;
    let checking = false;
    let stopped = false;

    async function leave(nextGeneration: number) {
      rememberGeneration(nextGeneration);
      try {
        localStorage.removeItem(SESSION_MEMORY_KEY);
      } catch {
        // A full navigation still discards the in-memory account state.
      }
      try {
        await signOut();
      } catch {
        // Reset already revoked every server session; discard this local page anyway.
      } finally {
        window.location.replace("/");
      }
    }

    async function check() {
      if (checking || busy || document.hidden) return;
      checking = true;
      try {
        const response = await api<ResetStatus>("/demo/reset-status");
        if (stopped || !response.ok || !response.data.enabled) return;
        const next = response.data.generation;
        if (generation !== null && generation !== next) {
          busy = true;
          await leave(next);
          return;
        }
        generation = next;
        rememberGeneration(next);
      } finally {
        checking = false;
      }
    }

    async function reset() {
      if (busy) return;
      busy = true;
      const toast = toastManager.add({
        title: "Resetting demo…",
        type: "loading",
        timeout: 0,
      });
      try {
        const status = await api<ResetStatus>("/demo/reset-status");
        if (!status.ok) throw new Error(status.error);
        if (!status.data.enabled)
          throw new Error("Demo reset is not available on this deployment.");
        const response = await api<{ generation: number }>("/demo/reset", {
          method: "POST",
          body: JSON.stringify({ expectedGeneration: status.data.generation }),
        });
        if (!response.ok) throw new Error(response.error);
        await leave(response.data.generation);
      } catch (error) {
        busy = false;
        toastManager.update(toast, {
          title: "Demo reset failed",
          description:
            error instanceof Error ? error.message : "Try the shortcut again.",
          type: "error",
          timeout: 8000,
        });
      }
    }

    function keydown(event: KeyboardEvent) {
      if (event.repeat || event.isComposing) return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
        detect("", performance.now());
        return;
      }
      if (detect(event.key, performance.now())) {
        event.preventDefault();
        void reset();
      }
    }

    window.addEventListener("keydown", keydown, true);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    const timer = window.setInterval(() => void check(), 5000);
    void check();
    return () => {
      stopped = true;
      window.clearInterval(timer);
      window.removeEventListener("keydown", keydown, true);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [signOut]);

  return null;
}

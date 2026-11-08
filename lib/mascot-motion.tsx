"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { MASCOT_MOTION_STORAGE_KEY } from "./mascot-feedback";

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(onChange: () => void) {
  const query = window.matchMedia(reducedMotionQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function readPausedPreference() {
  try {
    return localStorage.getItem(MASCOT_MOTION_STORAGE_KEY) === "paused";
  } catch {
    return false;
  }
}

const MotionContext = createContext({
  enabled: false,
  reducedMotion: true,
  ready: false,
  toggle: () => {},
});

export function MascotMotionProvider({ children }: { children: ReactNode }) {
  const reducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    () => window.matchMedia(reducedMotionQuery).matches,
    () => true,
  );
  const [paused, setPaused] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setPaused(readPausedPreference());
    setReady(true);
    const onStorage = (event: StorageEvent) => {
      if (event.key === MASCOT_MOTION_STORAGE_KEY || event.key === null)
        setPaused(readPausedPreference());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggle = () => {
    if (!ready || reducedMotion) return;
    const next = !paused;
    setPaused(next);
    try {
      localStorage.setItem(
        MASCOT_MOTION_STORAGE_KEY,
        next ? "paused" : "enabled",
      );
    } catch {
      // Storage can be blocked; the control still works for the current page.
    }
  };

  return (
    <MotionContext
      value={{
        enabled: ready && !paused && !reducedMotion,
        reducedMotion,
        ready,
        toggle,
      }}
    >
      {children}
    </MotionContext>
  );
}

export const useMascotMotion = () => useContext(MotionContext);

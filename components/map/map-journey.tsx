"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUpRightIcon } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { revealTiming } from "@/lib/map-reveal";
import { MapReveal } from "./map-reveal";

type Phase = "idle" | "covering" | "revealing";
const COVER_MS = revealTiming.covering;
const REVEAL_MS = revealTiming.revealing;
const JourneyContext = createContext({
  phase: "idle" as Phase,
  begin: () => {},
  ready: () => {},
});
export const useMapJourney = () => useContext(JourneyContext);

export function MapJourneyProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("idle");
  const navigating = useRef(false);
  const requested = useRef(false);
  const restoreFocus = useRef(false);
  const sourcePath = useRef(pathname);
  const navigationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ready = useCallback(
    () =>
      setPhase((current) => (current === "covering" ? "revealing" : current)),
    [],
  );

  const complete = useCallback(() => {
    if (navigationTimer.current) clearTimeout(navigationTimer.current);
    setPhase("idle");
    navigating.current = false;
    restoreFocus.current = true;
  }, []);

  const finish = useCallback(() => {
    complete();
    if (pathname !== "/map") router.push("/map");
  }, [complete, pathname, router]);
  const navigateToMap = useCallback(() => {
    if (navigationTimer.current) clearTimeout(navigationTimer.current);
    if (navigating.current && !requested.current) {
      requested.current = true;
      router.push("/map");
    }
  }, [router]);
  function begin() {
    if (navigating.current || pathname === "/map") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      router.push("/map");
      return;
    }
    navigating.current = true;
    requested.current = false;
    sourcePath.current = pathname;
    router.prefetch("/map");
    setPhase("covering");
    // Rendering normally advances navigation; retain a deadline for lost contexts/tabs.
    navigationTimer.current = setTimeout(navigateToMap, COVER_MS + 500);
  }

  useEffect(() => {
    if (phase === "idle") return;
    if (phase === "covering" && pathname === "/map") return;
    const timeout = setTimeout(
      complete,
      phase === "revealing" ? REVEAL_MS + 250 : 5000,
    );
    return () => clearTimeout(timeout);
  }, [complete, phase, pathname]);
  useEffect(() => {
    if (phase !== "idle" || pathname !== "/map" || !restoreFocus.current)
      return;
    restoreFocus.current = false;
    const frame = requestAnimationFrame(() =>
      document
        .getElementById("calgary-map-title")
        ?.focus({ preventScroll: true }),
    );
    return () => cancelAnimationFrame(frame);
  }, [phase, pathname]);
  useEffect(() => {
    if (
      (pathname !== sourcePath.current && pathname !== "/map") ||
      (pathname !== "/map" && phase === "revealing")
    ) {
      if (navigationTimer.current) clearTimeout(navigationTimer.current);
      setPhase("idle");
      navigating.current = false;
      restoreFocus.current = false;
    }
  }, [pathname, phase]);
  useEffect(() => {
    if (phase === "idle") return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const changed = () => {
      if (preference.matches) finish();
    };
    preference.addEventListener("change", changed);
    return () => {
      document.body.style.overflow = previousOverflow;
      preference.removeEventListener("change", changed);
    };
  }, [phase, finish]);
  useEffect(
    () => () => {
      if (navigationTimer.current) clearTimeout(navigationTimer.current);
    },
    [],
  );

  return (
    <JourneyContext.Provider value={{ phase, begin, ready }}>
      <div inert={phase !== "idle" || undefined}>{children}</div>
      <div role="status" className="sr-only">
        {phase !== "idle"
          ? "Travelling to Calgary. Use Skip animation to continue immediately."
          : ""}
      </div>
      {phase !== "idle" && (
        <div
          className="map-journey"
          data-phase={phase}
          data-testid="map-journey"
          style={
            {
              "--map-cover-duration": `${COVER_MS}ms`,
              "--map-reveal-duration": `${REVEAL_MS}ms`,
            } as CSSProperties
          }
          onKeyDown={(event) => {
            if (event.key === "Escape") finish();
          }}
        >
          <MapReveal
            phase={phase}
            onComplete={phase === "covering" ? navigateToMap : complete}
          />
          <div className="journey-caption" aria-hidden="true">
            <p className="mt-3 font-display text-6xl sm:text-8xl">Calgary.</p>
          </div>
          <Button
            variant="outline"
            onClick={finish}
            autoFocus
            className="absolute end-6 bottom-6 z-10"
          >
            Skip animation
            <ArrowUpRightIcon aria-hidden="true" />
          </Button>
        </div>
      )}
    </JourneyContext.Provider>
  );
}

export function MapJourneyLink({
  children = "Explore Calgary",
  ...props
}: Omit<ButtonProps, "render" | "onClick">) {
  const journey = useMapJourney();
  return (
    <Button
      {...props}
      render={<Link href="/map" />}
      onClick={(event) => {
        if (
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        )
          return;
        event.preventDefault();
        journey.begin();
      }}
    >
      {children}
    </Button>
  );
}

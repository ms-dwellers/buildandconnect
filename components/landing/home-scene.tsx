"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMapJourney } from "@/components/map/map-journey";
import { CITY_NAME } from "@/lib/calgary-area";
import { homeCopy } from "@/lib/home-copy";
import {
  approachTiming,
  readSceneTokens,
  sceneResolution,
} from "@/lib/home-scene";
import type { HomeSceneController, PickTarget } from "./home-scene/scene";
import "./home-scene.css";

type Renderer = "pending" | "webgl" | "fallback";

/**
 * The landing hero: two chairs around a monitor showing a campfire. three.js
 * loads lazily on the client; the server renders an empty white band so the
 * heading and actions above it never wait for WebGL.
 */
export function HomeScene() {
  const router = useRouter();
  const journey = useMapJourney();
  const wrapper = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const labels = useRef<
    Record<"developer" | "partner", HTMLParagraphElement | null>
  >({
    developer: null,
    partner: null,
  });
  const controller = useRef<HomeSceneController | null>(null);
  const schedule = useRef<() => void>(() => undefined);
  const phaseRef = useRef(journey.phase);
  const beginRef = useRef(journey.begin);
  const registerRef = useRef(journey.registerApproach);
  const [renderer, setRenderer] = useState<Renderer>("pending");
  const [ready, setReady] = useState(false);
  beginRef.current = journey.begin;
  registerRef.current = journey.registerApproach;

  useEffect(() => {
    const element = canvas.current;
    const host = wrapper.current;
    if (!element || !host) return;
    const root = getComputedStyle(document.documentElement);
    const tokens = readSceneTokens((name) => root.getPropertyValue(name));
    if (!tokens) {
      setRenderer("fallback");
      return;
    }
    const fontFamily =
      root.getPropertyValue("--app-font-display").trim() || "sans-serif";
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarse = window.matchMedia("(hover: none)");
    let api: HomeSceneController | null = null;
    let disposed = false;
    let frame = 0;
    let visible = true;
    let intersecting = 0;
    let registered = false;
    let hover: PickTarget | null = null;
    let press: { x: number; y: number; time: number } | null = null;

    const placeLabels = () => {
      for (const id of ["developer", "partner"] as const) {
        const node = labels.current[id];
        const point = api?.project(id);
        if (node && point)
          node.style.transform = `translate(${point.x}px, ${point.y}px)`;
      }
    };
    const tick = (now: number) => {
      frame = 0;
      if (disposed || !api) return;
      const phase = phaseRef.current;
      if (
        document.hidden ||
        !visible ||
        phase === "covering" ||
        phase === "revealing"
      )
        return;
      const more = api.render(now);
      placeLabels();
      if (more) kick();
    };
    const kick = () => {
      if (disposed || frame) return;
      frame = requestAnimationFrame(tick);
    };
    schedule.current = kick;
    const updateRegistration = () => {
      const should = api !== null && intersecting >= 0.5 && !preference.matches;
      if (should === registered) return;
      registered = should;
      registerRef.current(should ? { durationMs: approachTiming.dolly } : null);
    };
    const resize = new ResizeObserver(() => {
      if (!api) return;
      const { ratio } = sceneResolution(
        element.clientWidth,
        element.clientHeight,
        window.devicePixelRatio,
      );
      api.resize(element.clientWidth, element.clientHeight, ratio);
      kick();
    });
    const intersection = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        intersecting = entry.intersectionRatio;
        updateRegistration();
        if (visible) kick();
      },
      { threshold: [0, 0.5, 1] },
    );
    const motionChanged = () => {
      api?.setMotion(!preference.matches);
      updateRegistration();
      kick();
    };
    const visibilityChanged = () => kick();
    const toNdc = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1,
        y: -(((event.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1),
      };
    };
    const setHover = (target: PickTarget | null) => {
      if (target === hover || !api) return;
      hover = target;
      api.setHover(target);
      host.dataset.hover = target ?? "";
      element.style.cursor = target ? "pointer" : "";
    };
    const pointerMove = (event: PointerEvent) => {
      if (!api || coarse.matches) return;
      const point = toNdc(event);
      api.setPointer(point.x, point.y);
      setHover(api.pick(point.x, point.y));
      kick();
    };
    const pointerLeave = () => {
      api?.setPointer(0, 0);
      setHover(null);
      kick();
    };
    const pointerDown = (event: PointerEvent) => {
      press = { x: event.clientX, y: event.clientY, time: performance.now() };
    };
    const pointerUp = (event: PointerEvent) => {
      if (!api || !press) return;
      const quick =
        performance.now() - press.time < 300 &&
        Math.hypot(event.clientX - press.x, event.clientY - press.y) < 6;
      press = null;
      if (!quick || phaseRef.current !== "idle") return;
      const point = toNdc(event);
      const target = api.pick(point.x, point.y);
      if (target === "partner") router.push(homeCopy.ctas.post.href);
      else if (target) beginRef.current();
    };
    const contextLost = (event: Event) => {
      event.preventDefault();
      teardown();
      setRenderer("fallback");
    };
    function teardown() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(frame);
      resize.disconnect();
      intersection.disconnect();
      preference.removeEventListener("change", motionChanged);
      document.removeEventListener("visibilitychange", visibilityChanged);
      element?.removeEventListener("webglcontextlost", contextLost);
      element?.removeEventListener("pointermove", pointerMove);
      element?.removeEventListener("pointerleave", pointerLeave);
      element?.removeEventListener("pointerdown", pointerDown);
      element?.removeEventListener("pointerup", pointerUp);
      if (registered) registerRef.current(null);
      registered = false;
      api?.dispose();
      api = null;
      controller.current = null;
      schedule.current = () => undefined;
    }

    void import("./home-scene/scene")
      .then(({ createHomeScene }) => {
        if (disposed) return;
        try {
          api = createHomeScene(element, tokens, {
            approachMs: approachTiming.dolly,
            cityName: CITY_NAME,
            fontFamily,
          });
        } catch {
          setRenderer("fallback");
          return;
        }
        controller.current = api;
        api.setMotion(!preference.matches);
        const { ratio } = sceneResolution(
          element.clientWidth,
          element.clientHeight,
          window.devicePixelRatio,
        );
        api.resize(element.clientWidth, element.clientHeight, ratio);
        resize.observe(element);
        intersection.observe(element);
        preference.addEventListener("change", motionChanged);
        document.addEventListener("visibilitychange", visibilityChanged);
        element.addEventListener("webglcontextlost", contextLost);
        element.addEventListener("pointermove", pointerMove);
        element.addEventListener("pointerleave", pointerLeave);
        element.addEventListener("pointerdown", pointerDown);
        element.addEventListener("pointerup", pointerUp);
        api.render(performance.now());
        placeLabels();
        setRenderer("webgl");
        setReady(true);
        kick();
      })
      .catch(() => {
        if (!disposed) setRenderer("fallback");
      });
    return teardown;
  }, [router]);

  useEffect(() => {
    phaseRef.current = journey.phase;
    const api = controller.current;
    if (!api) return;
    if (journey.phase === "approaching") api.startApproach(performance.now());
    else if (journey.phase === "idle") api.resetApproach(performance.now());
    schedule.current();
  }, [journey.phase]);

  return (
    <div
      ref={wrapper}
      className="home-scene"
      aria-hidden="true"
      data-renderer={renderer}
      data-ready={ready || undefined}
      data-phase={journey.phase}
    >
      {renderer !== "fallback" && <canvas ref={canvas} />}
      {renderer === "webgl" && (
        <>
          <p
            ref={(node) => {
              labels.current.developer = node;
            }}
            className="home-scene-label"
            data-chair="developer"
          >
            {homeCopy.chairs.developer}
          </p>
          <p
            ref={(node) => {
              labels.current.partner = node;
            }}
            className="home-scene-label"
            data-chair="partner"
          >
            {homeCopy.chairs.partner}
          </p>
        </>
      )}
    </div>
  );
}

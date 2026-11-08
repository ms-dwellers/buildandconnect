"use client";

import { useEffect, useRef, useState } from "react";
import {
  revealFragmentSource,
  revealProgress,
  revealResolution,
  revealTiming,
  revealVertexSource,
  type RevealPhase,
} from "@/lib/map-reveal";

export function MapReveal({
  phase,
  onComplete,
}: {
  phase: RevealPhase;
  onComplete: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const settings = useRef({ phase, started: 0, onComplete, notified: false });
  const draw = useRef<(() => void) | null>(null);
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    let gl: WebGLRenderingContext | null;
    try {
      gl = element.getContext("webgl", {
        alpha: true,
        premultipliedAlpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: "low-power",
      });
    } catch {
      return;
    }
    if (!gl) return;
    const context = gl;
    const shaders: WebGLShader[] = [];
    let program: WebGLProgram | null = null;
    let buffer: WebGLBuffer | null = null;
    let frame = 0;
    let stopped = false;

    function release() {
      stopped = true;
      cancelAnimationFrame(frame);
      draw.current = null;
      context.deleteBuffer(buffer);
      context.deleteProgram(program);
      shaders.forEach((shader) => context.deleteShader(shader));
      context.getExtension("WEBGL_lose_context")?.loseContext();
    }

    function compile(type: number, source: string) {
      const shader = context.createShader(type);
      if (!shader) throw new Error("Reveal shader unavailable");
      shaders.push(shader);
      context.shaderSource(shader, source);
      context.compileShader(shader);
      if (!context.getShaderParameter(shader, context.COMPILE_STATUS))
        throw new Error("Reveal shader unavailable");
      return shader;
    }

    try {
      program = context.createProgram();
      if (!program) throw new Error("Reveal shader unavailable");
      context.attachShader(
        program,
        compile(context.VERTEX_SHADER, revealVertexSource),
      );
      context.attachShader(
        program,
        compile(context.FRAGMENT_SHADER, revealFragmentSource),
      );
      context.linkProgram(program);
      if (!context.getProgramParameter(program, context.LINK_STATUS))
        throw new Error("Reveal shader unavailable");
      context.useProgram(program);
      buffer = context.createBuffer();
      if (!buffer) throw new Error("Reveal buffer unavailable");
      context.bindBuffer(context.ARRAY_BUFFER, buffer);
      context.bufferData(
        context.ARRAY_BUFFER,
        new Float32Array([-1, -1, 3, -1, -1, 3]),
        context.STATIC_DRAW,
      );
      const position = context.getAttribLocation(program, "a_position");
      context.enableVertexAttribArray(position);
      context.vertexAttribPointer(position, 2, context.FLOAT, false, 0, 0);
      const styles = getComputedStyle(element);
      for (const [uniform, token] of [
        ["paper", "--background"],
        ["mint", "--secondary"],
      ]) {
        const hex = styles
          .getPropertyValue(token)
          .trim()
          .match(/^#([\da-f]{6})$/i)?.[1];
        if (!hex) throw new Error("Reveal color unavailable");
        context.uniform3fv(
          context.getUniformLocation(program, `u_${uniform}`),
          [0, 2, 4].map(
            (offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255,
          ),
        );
      }
      const resolution = context.getUniformLocation(program, "u_resolution");
      const progress = context.getUniformLocation(program, "u_progress");
      const revealing = context.getUniformLocation(program, "u_revealing");
      const render = (now = performance.now()) => {
        cancelAnimationFrame(frame);
        if (stopped || document.hidden) return;
        const current = settings.current;
        const amount = revealProgress(
          now - current.started,
          revealTiming[current.phase],
        );
        context.uniform2f(resolution, element.width, element.height);
        context.uniform1f(progress, amount);
        context.uniform1f(revealing, current.phase === "revealing" ? 1 : 0);
        context.drawArrays(context.TRIANGLES, 0, 3);
        if (amount < 1) frame = requestAnimationFrame(render);
        else if (!current.notified) {
          current.notified = true;
          current.onComplete();
        }
      };
      draw.current = render;
      settings.current.started = performance.now();
      const resize = () => {
        const size = revealResolution(
          element.clientWidth,
          element.clientHeight,
        );
        element.width = size.width;
        element.height = size.height;
        context.viewport(0, 0, size.width, size.height);
        render();
      };
      const observer = new ResizeObserver(resize);
      const visibility = () => {
        if (document.hidden) cancelAnimationFrame(frame);
        else render();
      };
      const lost = (event: Event) => {
        event.preventDefault();
        stopped = true;
        cancelAnimationFrame(frame);
        setAvailable(false);
      };
      observer.observe(element);
      document.addEventListener("visibilitychange", visibility);
      element.addEventListener("webglcontextlost", lost);
      resize();
      setAvailable(true);
      return () => {
        observer.disconnect();
        document.removeEventListener("visibilitychange", visibility);
        element.removeEventListener("webglcontextlost", lost);
        release();
      };
    } catch {
      release();
    }
  }, []);

  useEffect(() => {
    settings.current = {
      phase,
      started: performance.now(),
      onComplete,
      notified: false,
    };
    draw.current?.();
  }, [phase, onComplete]);

  return (
    <div
      className="map-reveal"
      data-renderer={available ? "webgl" : "fallback"}
      aria-hidden="true"
    >
      <div
        className="map-reveal-fallback"
        onAnimationEnd={(event) => {
          if (
            event.target === event.currentTarget &&
            !available &&
            !settings.current.notified
          ) {
            settings.current.notified = true;
            onComplete();
          }
        }}
      />
      <canvas ref={canvas} className="map-reveal-canvas" />
    </div>
  );
}

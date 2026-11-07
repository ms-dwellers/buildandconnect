"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

const vertexSource = `
attribute vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`;

const fragmentSource = `
precision mediump float;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_energy;
uniform vec3 u_sand;
uniform vec3 u_moss;
uniform vec3 u_rust;
uniform vec3 u_plum;

float grain(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float t = u_time * 0.36;
  vec3 color = mix(u_sand, vec3(0.989, 0.978, 0.954), smoothstep(0.35, 1.0, uv.y));
  float x = uv.x * 1.9;
  float flow = sin(x * 2.4 + t) * (0.13 + u_energy * 0.06) + sin(x * 4.2 - t * 0.7) * 0.045;
  for (int i = 0; i < 4; i++) {
    float n = float(i);
    float ridge = 0.20 + n * 0.115 + flow + sin(x * 3.0 + n * 0.9 + t * 0.6) * 0.05;
    float d = uv.y - ridge;
    float width = 0.045 + n * 0.016 + u_energy * 0.045;
    float ribbon = exp(-d * d / (width * width));
    float mist = exp(-d * d / (width * width * 9.0));
    vec3 tint = n < 1.0 ? u_moss : n < 2.0 ? u_plum : u_rust;
    color = mix(color, tint, ribbon * (0.34 + u_energy * 0.22));
    color = mix(color, tint, mist * 0.07);
    float edge = exp(-pow((d - width * 0.6) / (width * 0.12), 2.0));
    color = mix(color, vec3(1.0, 0.985, 0.955), edge * 0.12);
  }
  float light = exp(-length((uv - vec2(0.50, 0.53)) * vec2(1.3, 1.0)) * 3.4);
  color = mix(color, u_sand, light * 0.34);
  color += (grain(gl_FragCoord.xy) - 0.5) * 0.024;
  gl_FragColor = vec4(color, 1.0);
}
`;

export function Aurora({
  moving,
  speaking,
  microphone,
}: {
  moving: boolean;
  speaking: boolean;
  microphone?: RefObject<number>;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const settings = useRef({ moving, speaking, microphone });
  const draw = useRef<(() => void) | null>(null);
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    settings.current = { moving, speaking, microphone };
    draw.current?.();
  }, [moving, speaking, microphone]);

  useEffect(() => {
    const element = canvas.current;
    const gl = element?.getContext("webgl", {
      alpha: false,
      antialias: false,
      powerPreference: "low-power",
    });
    if (!element || !gl) return;
    const shaders: WebGLShader[] = [];
    let program: WebGLProgram | null = null;
    let buffer: WebGLBuffer | null = null;
    let frame = 0;
    let stopped = false;
    let visible = true;
    let time = 0;
    let previous = 0;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");

    function compile(type: number, source: string) {
      const shader = gl!.createShader(type);
      if (!shader) throw new Error("Shader unavailable");
      shaders.push(shader);
      gl!.shaderSource(shader, source);
      gl!.compileShader(shader);
      if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS))
        throw new Error("Shader unavailable");
      return shader;
    }

    try {
      program = gl.createProgram();
      if (!program) throw new Error("Shader unavailable");
      gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        throw new Error("Shader unavailable");
      gl.useProgram(program);
      buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW,
      );
      const position = gl.getAttribLocation(program, "a_position");
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      const styles = getComputedStyle(element);
      for (const name of ["sand", "moss", "rust", "plum"]) {
        const hex = styles
          .getPropertyValue(`--voice-${name}`)
          .trim()
          .replace("#", "");
        const rgb = [0, 2, 4].map(
          (offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255,
        );
        gl.uniform3fv(gl.getUniformLocation(program, `u_${name}`), rgb);
      }
      const resolution = gl.getUniformLocation(program, "u_resolution");
      const clock = gl.getUniformLocation(program, "u_time");
      const energy = gl.getUniformLocation(program, "u_energy");
      const render = (now = performance.now()) => {
        cancelAnimationFrame(frame);
        if (stopped || !visible || document.hidden) return;
        const animate = settings.current.moving && !preference.matches;
        if (animate && previous && now - previous < 1000 / 30) {
          frame = requestAnimationFrame(render);
          return;
        }
        const input = settings.current.microphone?.current;
        const intensity = input ?? (settings.current.speaking ? 1 : 0);
        if (animate && previous)
          time +=
            (Math.min(now - previous, 80) / 1000) * (1 + intensity * 0.75);
        previous = now;
        gl.uniform2f(resolution, element.width, element.height);
        gl.uniform1f(clock, time);
        gl.uniform1f(energy, intensity);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        if (animate) frame = requestAnimationFrame(render);
      };
      draw.current = () => {
        previous = 0;
        render();
      };
      const resize = new ResizeObserver(() => {
        const ratio = Math.min(devicePixelRatio || 1, 1.5);
        element.width = Math.max(1, Math.round(element.clientWidth * ratio));
        element.height = Math.max(1, Math.round(element.clientHeight * ratio));
        gl.viewport(0, 0, element.width, element.height);
        draw.current?.();
      });
      const intersection = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (!visible) cancelAnimationFrame(frame);
        else draw.current?.();
      });
      const changed = () => draw.current?.();
      const lost = (event: Event) => {
        event.preventDefault();
        stopped = true;
        cancelAnimationFrame(frame);
        setAvailable(false);
      };
      resize.observe(element);
      intersection.observe(element);
      preference.addEventListener("change", changed);
      document.addEventListener("visibilitychange", changed);
      element.addEventListener("webglcontextlost", lost);
      setAvailable(true);
      return () => {
        stopped = true;
        cancelAnimationFrame(frame);
        draw.current = null;
        resize.disconnect();
        intersection.disconnect();
        preference.removeEventListener("change", changed);
        document.removeEventListener("visibilitychange", changed);
        element.removeEventListener("webglcontextlost", lost);
        gl.deleteBuffer(buffer);
        gl.deleteProgram(program);
        shaders.forEach((shader) => gl.deleteShader(shader));
      };
    } catch {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      shaders.forEach((shader) => gl.deleteShader(shader));
    }
  }, []);

  return (
    <div
      className="voice-aurora"
      aria-hidden="true"
      data-renderer={available ? "webgl" : "fallback"}
      data-input={microphone ? "microphone" : "demo"}
    >
      <canvas ref={canvas} className={available ? "is-ready" : ""} />
    </div>
  );
}

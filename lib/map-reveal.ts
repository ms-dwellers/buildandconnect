export type RevealPhase = "covering" | "revealing";

export const revealTiming = { covering: 650, revealing: 1000 } as const;

export function revealProgress(elapsed: number, duration: number) {
  const progress = Math.max(0, Math.min(1, elapsed / duration));
  return progress * progress * (3 - 2 * progress);
}

export function revealResolution(width: number, height: number) {
  const scale = Math.min(
    0.5,
    768 / Math.max(1, width),
    512 / Math.max(1, height),
  );
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export const revealVertexSource = `
attribute vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`;

export const revealFragmentSource = `
precision mediump float;
uniform vec2 u_resolution;
uniform float u_progress;
uniform float u_revealing;
uniform vec3 u_paper;
uniform vec3 u_mint;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 p = (uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
  float reach = length(vec2(u_resolution.x / u_resolution.y, 1.0)) * 0.5;
  float ripple = sin(p.y * 9.0 + p.x * 4.0) * 0.025
               + sin(p.x * 7.0 - p.y * 5.0) * 0.018;
  float radius = length(p) + ripple;
  float edge = mix(-0.12, reach + 0.12, u_progress);
  float outside = smoothstep(edge - 0.035, edge + 0.035, radius);
  float alpha = mix(1.0 - outside, outside, u_revealing);
  float shade = 0.2 + 0.12 * sin(p.x * 2.0 + p.y * 3.0);
  vec3 color = mix(u_paper, u_mint, shade);
  gl_FragColor = vec4(color * alpha, alpha);
}
`;

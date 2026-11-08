export type RevealPhase = "covering" | "revealing";

export const revealTiming = { covering: 650, revealing: 1000 } as const;
export const MIST_TEXTURE_SIZE = 128;

export function createMistTexture() {
  const pixels = new Uint8Array(MIST_TEXTURE_SIZE * MIST_TEXTURE_SIZE * 4);
  for (const [channel, period] of [8, 16, 32].entries()) {
    const grid = Array.from({ length: period * period }, (_, index) => {
      let value = Math.imul(index + channel * 4099 + 17, 0x45d9f3b);
      value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
      return ((value ^ (value >>> 16)) >>> 0) / 0xffffffff;
    });
    for (let y = 0; y < MIST_TEXTURE_SIZE; y++) {
      for (let x = 0; x < MIST_TEXTURE_SIZE; x++) {
        const gx = (x / MIST_TEXTURE_SIZE) * period;
        const gy = (y / MIST_TEXTURE_SIZE) * period;
        const ix = Math.floor(gx);
        const iy = Math.floor(gy);
        const fx = gx - ix;
        const fy = gy - iy;
        const sx = fx * fx * (3 - 2 * fx);
        const sy = fy * fy * (3 - 2 * fy);
        const a = grid[iy * period + ix];
        const b = grid[iy * period + ((ix + 1) % period)];
        const c = grid[((iy + 1) % period) * period + ix];
        const d = grid[((iy + 1) % period) * period + ((ix + 1) % period)];
        const top = a + (b - a) * sx;
        const bottom = c + (d - c) * sx;
        const offset = (y * MIST_TEXTURE_SIZE + x) * 4;
        pixels[offset + channel] = Math.round(
          (top + (bottom - top) * sy) * 255,
        );
        pixels[offset + 3] = 255;
      }
    }
  }
  return pixels;
}

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
uniform sampler2D u_mist;
uniform vec3 u_light;
uniform vec3 u_shadow;

float mist(vec2 p) {
  vec2 curl = texture2D(u_mist, p * 0.45 + vec2(0.23, 0.71)).rg - 0.5;
  return dot(texture2D(u_mist, p + curl * 0.32).rgb, vec3(0.6, 0.3, 0.1));
}

float bank(vec2 p, float opening, float density, float softness, float offset) {
  float billow = (density - 0.5) * 0.65 + sin(p.y * 5.0 + offset) * 0.07;
  return smoothstep(-softness, softness, abs(p.x) - opening + billow);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 p = (uv - 0.5) * vec2(u_resolution.x / u_resolution.y, 1.0);
  float clear = mix(1.0 - u_progress, u_progress, u_revealing);
  float side = smoothstep(-0.12, 0.12, p.x) * 2.0 - 1.0;
  float reach = u_resolution.x / u_resolution.y * 0.5 + 0.7;
  vec2 flow = p * vec2(0.58, 0.7);

  float distant = mist(flow + vec2(-side * clear * 0.12, clear * 0.03));
  float middle = mist(flow * 1.35 + vec2(0.37 - side * clear * 0.25, 0.61 + clear * 0.08));
  float nearby = mist(flow * 1.8 + vec2(0.73 - side * clear * 0.42, 0.19 - clear * 0.12));

  float farOpening = mix(-0.5, reach, clear * (0.8 + 0.2 * clear));
  float midOpening = mix(-0.5, reach, clear);
  float nearOpening = mix(-0.5, reach, clear * (1.35 - 0.35 * clear));
  float farAlpha = max(1.0 - smoothstep(0.0, 0.08, clear), bank(p, farOpening, distant, 0.2, 0.0));
  float midAlpha = bank(p, midOpening, middle, 0.15, 1.4) * (0.4 + middle * 0.45);
  float nearAlpha = bank(p, nearOpening, nearby, 0.11, 3.1) * (0.25 + nearby * 0.65);

  vec3 farColor = mix(u_light, u_shadow, (1.0 - smoothstep(0.25, 0.75, distant)) * 0.8);
  vec3 midColor = mix(u_light, u_shadow, (1.0 - smoothstep(0.25, 0.75, middle)) * 0.65);
  vec3 nearColor = mix(u_light, u_shadow, (1.0 - smoothstep(0.25, 0.75, nearby)) * 0.5);
  vec3 color = farColor * farAlpha;
  color = midColor * midAlpha + color * (1.0 - midAlpha);
  color = nearColor * nearAlpha + color * (1.0 - nearAlpha);
  float alpha = 1.0 - (1.0 - farAlpha) * (1.0 - midAlpha) * (1.0 - nearAlpha);
  gl_FragColor = vec4(color, alpha);
}
`;

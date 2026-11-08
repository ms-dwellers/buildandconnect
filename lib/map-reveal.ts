export type RevealPhase = "covering" | "revealing";

export const revealTiming = { covering: 650, revealing: 1000 } as const;
export const MIST_TEXTURE_SIZE = 128;

export function createMistTexture() {
  const size = MIST_TEXTURE_SIZE;
  const density = new Float32Array(size * size);
  const random = (seed: number) => {
    let value = Math.imul(seed + 17, 0x45d9f3b);
    value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
    return ((value ^ (value >>> 16)) >>> 0) / 0xffffffff;
  };
  const wrap = (value: number) => ((value % size) + size) % size;

  // Overlapping round lobes form cloud clumps, not warped noise veins.
  for (let cluster = 0; cluster < 8; cluster++) {
    const centerX = ((cluster % 4) + 0.25 + random(cluster * 131) * 0.5) / 4;
    const centerY =
      (Math.floor(cluster / 4) + 0.25 + random(cluster * 131 + 1) * 0.5) / 2;
    for (let puff = 0; puff < 15; puff++) {
      const seed = cluster * 131 + puff * 7 + 2;
      const small = puff >= 5;
      const angle = random(seed) * Math.PI * 2;
      const spread = random(seed + 1) * (small ? 0.14 : 0.1);
      const cx = (centerX + Math.cos(angle) * spread) * size;
      const cy = (centerY + Math.sin(angle) * spread) * size;
      const radius =
        (small
          ? 0.012 + random(seed + 2) * 0.015
          : 0.035 + random(seed + 2) * 0.04) * size;
      const strength = small
        ? 0.2 + random(seed + 3) * 0.2
        : 0.35 + random(seed + 3) * 0.5;
      const extent = Math.ceil(radius * 3);
      for (let y = Math.floor(cy) - extent; y <= cy + extent; y++) {
        for (let x = Math.floor(cx) - extent; x <= cx + extent; x++) {
          const distance = (x - cx) ** 2 + (y - cy) ** 2;
          const puffDensity =
            strength * Math.exp(-distance / (2 * radius * radius));
          const index = wrap(y) * size + wrap(x);
          density[index] = 1 - (1 - density[index]) * (1 - puffDensity);
        }
      }
    }
  }

  // Pack density and surface slopes so lighting needs no extra texture reads.
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const index = y * size + x;
      const dx =
        density[y * size + wrap(x + 1)] - density[y * size + wrap(x - 1)];
      const dy =
        density[wrap(y + 1) * size + x] - density[wrap(y - 1) * size + x];
      pixels[index * 4] = Math.round(density[index] * 255);
      pixels[index * 4 + 1] = Math.round(
        (0.5 - Math.max(-1, Math.min(1, dx * 10)) * 0.5) * 255,
      );
      pixels[index * 4 + 2] = Math.round(
        (0.5 - Math.max(-1, Math.min(1, dy * 10)) * 0.5) * 255,
      );
      pixels[index * 4 + 3] = 255;
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

vec3 cloudColor(vec3 cloud) {
  vec3 normal = normalize(vec3(cloud.gb * 2.0 - 1.0, 1.0));
  float sun = max(0.0, dot(normal, normalize(vec3(-0.45, 0.65, 0.8))));
  float brightness = clamp(0.2 + cloud.r * 0.65 + sun * 0.25, 0.0, 1.0);
  return mix(u_shadow, u_light, brightness);
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
  vec2 flow = p * 0.7;

  vec3 distant = texture2D(u_mist, flow + vec2(-side * clear * 0.12, clear * 0.03)).rgb;
  vec3 middle = texture2D(u_mist, flow * 1.35 + vec2(0.37 - side * clear * 0.25, 0.61 + clear * 0.08)).rgb;
  vec3 nearby = texture2D(u_mist, flow * 1.8 + vec2(0.73 - side * clear * 0.42, 0.19 - clear * 0.12)).rgb;

  float farOpening = mix(-0.5, reach, clear * (0.8 + 0.2 * clear));
  float midOpening = mix(-0.5, reach, clear);
  float nearOpening = mix(-0.5, reach, clear * (1.35 - 0.35 * clear));
  float farAlpha = max(1.0 - smoothstep(0.0, 0.08, clear), bank(p, farOpening, distant.r, 0.2, 0.0));
  float midAlpha = bank(p, midOpening, middle.r, 0.15, 1.4) * (0.25 + middle.r * 0.65);
  float nearAlpha = bank(p, nearOpening, nearby.r, 0.11, 3.1) * (0.15 + nearby.r * 0.8);

  vec3 farColor = cloudColor(distant);
  vec3 midColor = cloudColor(middle);
  vec3 nearColor = cloudColor(nearby);
  vec3 color = farColor * farAlpha;
  color = midColor * midAlpha + color * (1.0 - midAlpha);
  color = nearColor * nearAlpha + color * (1.0 - nearAlpha);
  float alpha = 1.0 - (1.0 - farAlpha) * (1.0 - midAlpha) * (1.0 - nearAlpha);
  gl_FragColor = vec4(color, alpha);
}
`;

/**
 * Pure geometry, timing, and palette logic for the landing hero scene. Nothing
 * here touches the DOM or three.js, so `node --test` covers it directly.
 */

export const approachTiming = {
  /** Camera dolly into the monitor before the mist starts, in milliseconds. */
  dolly: 1100,
  /** Fractions of the dolly during which the screen crossfades to the city name. */
  cityFrom: 0.5,
  cityTo: 0.8,
} as const;

export const SCENE = {
  fov: 32,
  /** Close enough that the furniture fills the frame height on wide canvases. */
  minDistance: 3.5,
  /** Half of the composition that must stay in frame: both chairs plus margin. */
  halfWidth: 1.65,
  objectTop: 1.5,
  chairOffset: 1.15,
  chairDepth: 0.35,
  chairYaw: Math.PI / 4,
  tableDepth: -0.25,
  screen: { center: [0, 1.15, -0.21] as const, width: 1, height: 0.625 },
  /** Where each chair's action button hangs: clear above the chair backs. */
  labelAnchors: {
    developer: [-1.15, 1.24, 0.35] as const,
    partner: [1.15, 1.12, 0.35] as const,
  },
} as const;

/** 16:10 like the monitor; large enough to stay sharp when it fills the viewport. */
export const SCREEN_TEXTURE = { width: 1280, height: 800 } as const;

export type Vec3 = readonly [number, number, number];
export type Pose = { position: Vec3; target: Vec3 };
export type CameraRig = {
  fov: number;
  distance: number;
  cameraY: number;
  lookAtY: number;
  halfHeight: number;
  halfWidth: number;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const halfTangent = (fov: number) => Math.tan((fov * Math.PI) / 360);
const safeAspect = (aspect: number) =>
  Math.max(0.3, Number.isFinite(aspect) && aspect > 0 ? aspect : 1);

/** Ease-in-out cubic progress of the dolly, clamped to [0, 1]. */
export function approachProgress(elapsed: number, duration: number) {
  const t = clamp01(duration > 0 ? elapsed / duration : 1);
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/** How far the screen has crossfaded from the fire to the city name. */
export function screenBlend(progress: number) {
  const span = approachTiming.cityTo - approachTiming.cityFrom;
  const t = clamp01((progress - approachTiming.cityFrom) / span);
  return t * t * (3 - 2 * t);
}

/** Camera placement that keeps both chairs in frame at any aspect ratio. */
export function cameraRig(aspect: number): CameraRig {
  const ratio = safeAspect(aspect);
  const half = halfTangent(SCENE.fov);
  const distance = Math.max(
    SCENE.minDistance,
    SCENE.halfWidth / (half * ratio),
  );
  const halfHeight = half * distance;
  const lookAtY = 0.84 * halfHeight;
  return {
    fov: SCENE.fov,
    distance,
    cameraY: lookAtY + 0.55,
    lookAtY,
    halfHeight,
    halfWidth: halfHeight * ratio,
  };
}

export function restPose(rig: CameraRig): Pose {
  return {
    position: [0, rig.cameraY, rig.distance],
    target: [0, rig.lookAtY, 0],
  };
}

/** Where the dolly ends: the monitor screen slightly overfills the viewport. */
export function screenPose(rig: CameraRig, aspect: number): Pose {
  const [x, y, z] = SCENE.screen.center;
  const half = halfTangent(rig.fov);
  const fitHeight = SCENE.screen.height / 2 / half;
  const fitWidth = SCENE.screen.width / 2 / (half * safeAspect(aspect));
  const distance = Math.min(fitHeight, fitWidth) * 0.92;
  return { position: [x, y, z + distance], target: [x, y, z] };
}

export function lerpVec3(from: Vec3, to: Vec3, t: number): Vec3 {
  return [
    from[0] + (to[0] - from[0]) * t,
    from[1] + (to[1] - from[1]) * t,
    from[2] + (to[2] - from[2]) * t,
  ];
}

export function dollyPose(
  progress: number,
  rig: CameraRig,
  aspect: number,
): Pose {
  const from = restPose(rig);
  const to = screenPose(rig, aspect);
  const t = clamp01(progress);
  return {
    position: lerpVec3(from.position, to.position, t),
    target: lerpVec3(from.target, to.target, t),
  };
}

/** Six-digit hex colour to linear 0..1 channels; anything else is rejected. */
export function parseHexToken(value: string): [number, number, number] | null {
  const match = /^#([0-9a-f]{6})$/i.exec(value.trim());
  if (!match) return null;
  const packed = Number.parseInt(match[1], 16);
  return [
    ((packed >> 16) & 255) / 255,
    ((packed >> 8) & 255) / 255,
    (packed & 255) / 255,
  ];
}

/** Mix a hex colour toward black (negative amount) or white (positive amount). */
export function shadeHex(hex: string, amount: number) {
  const rgb = parseHexToken(hex);
  if (!rgb) return hex;
  const target = amount < 0 ? 0 : 1;
  const weight = Math.min(1, Math.abs(amount));
  return `#${rgb
    .map((channel) =>
      Math.round((channel + (target - channel) * weight) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

export function rgbaFromHex(hex: string, alpha: number) {
  const rgb = parseHexToken(hex) ?? [0, 0, 0];
  return `rgba(${rgb.map((channel) => Math.round(channel * 255)).join(", ")}, ${alpha})`;
}

/** Every token the scene reads. All must resolve to six-digit hex values. */
export const SCENE_TOKENS = {
  background: "--background",
  primary: "--primary",
  pine: "--palette-pine",
  mint: "--palette-mint",
  wheat: "--palette-wheat",
  apricot: "--palette-apricot",
  coral: "--palette-coral",
  wood: "--scene-wood",
  woodEdge: "--scene-wood-edge",
  metal: "--scene-metal",
  metalEdge: "--scene-metal-edge",
  bezel: "--scene-bezel",
  shadow: "--scene-shadow",
  fabric: "--scene-fabric",
  cushion: "--scene-cushion",
} as const;
export type SceneTokens = Record<keyof typeof SCENE_TOKENS, string>;

export function readSceneTokens(
  getValue: (name: string) => string,
): SceneTokens | null {
  const tokens: Partial<SceneTokens> = {};
  for (const [key, name] of Object.entries(SCENE_TOKENS) as [
    keyof typeof SCENE_TOKENS,
    string,
  ][]) {
    const value = getValue(name).trim().toLowerCase();
    if (!parseHexToken(value)) return null;
    tokens[key] = value;
  }
  return tokens as SceneTokens;
}

export type Ember = {
  x: number;
  /** Progress of the climb from the flame base (0) to the top (1). */
  y: number;
  speed: number;
  sway: number;
  phase: number;
  size: number;
  warm: boolean;
};

function random(seed: number) {
  let value = Math.imul(seed + 17, 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  return ((value ^ (value >>> 16)) >>> 0) / 0xffffffff;
}

export function createEmbers(count: number, seed: number): Ember[] {
  return Array.from({ length: count }, (_, index) => {
    const base = seed * 97 + index * 11;
    return {
      x: 0.38 + random(base) * 0.24,
      y: random(base + 1),
      speed: 0.12 + random(base + 2) * 0.16,
      sway: 0.01 + random(base + 3) * 0.02,
      phase: random(base + 4) * Math.PI * 2,
      size: 1.5 + random(base + 5) * 1.5,
      warm: index % 2 === 0,
    };
  });
}

/** Advance embers by `dt` seconds; they rise from the flame and recycle. */
export function stepEmbers(embers: Ember[], dt: number) {
  const step = Math.max(0, Math.min(Number.isFinite(dt) ? dt : 0, 0.1));
  for (const ember of embers) {
    ember.y += ember.speed * step;
    if (ember.y > 1) ember.y -= 1;
  }
  return embers;
}

/** Texture-relative position (0..1 from the top-left) and alpha of an ember. */
export function emberPosition(ember: Ember, time: number) {
  return {
    x: ember.x + Math.sin(time * 2 + ember.phase) * ember.sway,
    y: 0.7 - ember.y * 0.6,
    alpha: 1 - ember.y,
  };
}

/** Control points, in texture pixels, for one teardrop flame layer. */
export function flameOutline(
  time: number,
  layer: 0 | 1 | 2,
  width = SCREEN_TEXTURE.width,
  height = SCREEN_TEXTURE.height,
) {
  const scale = [1, 0.72, 0.45][layer];
  const baseX = width / 2;
  const baseY = height * 0.72;
  const flicker =
    1 + 0.08 * Math.sin(time * 5.1 + layer) * Math.sin(time * 2.3);
  const flameHeight = height * 0.42 * scale * flicker;
  const halfWidth =
    width * 0.17 * scale * (1 + 0.06 * Math.sin(time * 3.7 + layer * 1.3));
  const lean = width * 0.04 * scale * Math.sin(time * 1.9 + layer * 0.7);
  return {
    baseX,
    baseY,
    tipX: baseX + lean,
    tipY: baseY - flameHeight,
    halfWidth,
    waistY: baseY - flameHeight * 0.45,
  };
}

/** Drawing-buffer size with the pixel ratio capped for low-power rendering. */
export function sceneResolution(
  width: number,
  height: number,
  pixelRatio: number,
) {
  const ratio = Math.max(
    0.5,
    Math.min(pixelRatio || 1, 1.5, 1920 / Math.max(1, width)),
  );
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
    ratio,
  };
}

import * as THREE from "three";
import {
  SCREEN_TEXTURE,
  createEmbers,
  emberPosition,
  flameOutline,
  rgbaFromHex,
  shadeHex,
  stepEmbers,
  type SceneTokens,
} from "@/lib/home-scene";

export type FirepitTexture = {
  texture: THREE.CanvasTexture;
  /** Redraws when due; returns true when the texture changed. */
  draw(now: number, blend: number, motion: boolean): boolean;
  dispose(): void;
};

const FRAME_MS = 1000 / 24;
/** A pleasing mid-flicker moment for the single frame drawn under reduced motion. */
const STILL_TIME = 1.7;

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

/**
 * The monitor's picture: a campfire on a pine backdrop, echoing the brand's
 * crossed logs, that crossfades to the city name during the approach.
 */
export function createFirepitTexture(
  tokens: SceneTokens,
  options: { cityName: string; fontFamily: string },
): FirepitTexture | null {
  const canvas = document.createElement("canvas");
  const { width, height } = SCREEN_TEXTURE;
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return null;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;

  const embers = createEmbers(12, 7);
  const vignette = shadeHex(tokens.pine, -0.35);
  const flameFills = [
    rgbaFromHex(tokens.coral, 0.92),
    tokens.apricot,
    tokens.wheat,
  ];
  let lastDraw = Number.NEGATIVE_INFINITY;
  let lastBlend = -1;
  let drewStill = false;

  function drawFire(time: number) {
    context!.globalAlpha = 1;
    context!.fillStyle = tokens.pine;
    context!.fillRect(0, 0, width, height);
    const edge = context!.createRadialGradient(
      width / 2,
      height * 0.6,
      height * 0.2,
      width / 2,
      height * 0.6,
      width * 0.75,
    );
    edge.addColorStop(0, rgbaFromHex(vignette, 0));
    edge.addColorStop(1, rgbaFromHex(vignette, 0.85));
    context!.fillStyle = edge;
    context!.fillRect(0, 0, width, height);
    const glow = context!.createRadialGradient(
      width / 2,
      height * 0.7,
      0,
      width / 2,
      height * 0.7,
      height * 0.55 * (1 + 0.06 * Math.sin(time * 4)),
    );
    glow.addColorStop(0, rgbaFromHex(tokens.apricot, 0.28));
    glow.addColorStop(1, rgbaFromHex(tokens.apricot, 0));
    context!.fillStyle = glow;
    context!.fillRect(0, 0, width, height);
    for (const angle of [-22, 22]) {
      context!.save();
      context!.translate(width / 2, height * 0.75);
      context!.rotate((angle * Math.PI) / 180);
      context!.fillStyle = tokens.wood;
      roundedRect(context!, -75, -11, 150, 22, 8);
      context!.fill();
      context!.fillStyle = tokens.woodEdge;
      roundedRect(context!, -75, -11, 16, 22, 6);
      context!.fill();
      roundedRect(context!, 59, -11, 16, 22, 6);
      context!.fill();
      context!.restore();
    }
    for (const layer of [0, 1, 2] as const) {
      const flame = flameOutline(time, layer, width, height);
      context!.beginPath();
      context!.moveTo(flame.baseX - flame.halfWidth, flame.baseY);
      context!.quadraticCurveTo(
        flame.baseX - flame.halfWidth * 0.9,
        flame.waistY,
        flame.tipX,
        flame.tipY,
      );
      context!.quadraticCurveTo(
        flame.baseX + flame.halfWidth * 0.9,
        flame.waistY,
        flame.baseX + flame.halfWidth,
        flame.baseY,
      );
      context!.closePath();
      context!.fillStyle = flameFills[layer];
      context!.fill();
    }
    for (const ember of embers) {
      const point = emberPosition(ember, time);
      context!.globalAlpha = point.alpha * 0.9;
      context!.fillStyle = ember.warm ? tokens.apricot : tokens.coral;
      context!.beginPath();
      context!.arc(
        point.x * width,
        point.y * height,
        ember.size,
        0,
        Math.PI * 2,
      );
      context!.fill();
    }
    context!.globalAlpha = 1;
  }

  function drawCity(blend: number) {
    context!.globalAlpha = blend;
    context!.fillStyle = tokens.background;
    context!.fillRect(0, 0, width, height);
    context!.fillStyle = tokens.primary;
    context!.textAlign = "center";
    context!.textBaseline = "middle";
    const size = Math.round(72 * (0.94 + 0.06 * blend));
    context!.font = `700 ${size}px ${options.fontFamily}`;
    context!.fillText(options.cityName, width / 2, height / 2);
    context!.globalAlpha = 1;
  }

  return {
    texture,
    draw(now, blend, motion) {
      if (!motion && blend === 0 && drewStill) return false;
      if (motion && blend === lastBlend && now - lastDraw < FRAME_MS)
        return false;
      if (motion) stepEmbers(embers, (now - lastDraw) / 1000);
      lastDraw = now;
      lastBlend = blend;
      drewStill = !motion;
      drawFire(motion ? now / 1000 : STILL_TIME);
      if (blend > 0) drawCity(blend);
      texture.needsUpdate = true;
      return true;
    },
    dispose() {
      texture.dispose();
    },
  };
}

import * as THREE from "three";
import {
  CAMPFIRE_FRAME_MS,
  CAMPFIRE_FRAME_SRCS,
  CAMPFIRE_STILL_SRC,
  SCREEN_TEXTURE,
  campfireDest,
  type SceneTokens,
} from "@/lib/home-scene";

export type FirepitTexture = {
  texture: THREE.CanvasTexture;
  /** Redraws when due; returns true when the texture changed. */
  draw(now: number, blend: number, motion: boolean): boolean;
  dispose(): void;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error(`Campfire frame failed to load: ${src}`));
    image.src = src;
  });
}

/**
 * The monitor's picture: the brand's pixel campfire looping on a pine
 * backdrop, that crossfades to the city name during the approach. Frames are
 * discrete PNGs so Canvas can advance them reliably (drawing an animated GIF
 * only ever yields the first frame).
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
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.NearestFilter;

  let frames: HTMLImageElement[] = [];
  let still: HTMLImageElement | null = null;
  let ready = false;
  let lastDraw = Number.NEGATIVE_INFINITY;
  let lastBlend = -1;
  let lastFrame = -1;
  let drewStill = false;
  let cancelled = false;

  void Promise.all([
    Promise.all(CAMPFIRE_FRAME_SRCS.map(loadImage)),
    loadImage(CAMPFIRE_STILL_SRC).catch(() => null),
  ]).then(([loaded, stillImage]) => {
    if (cancelled) return;
    frames = loaded;
    still = stillImage;
    ready = true;
    lastDraw = Number.NEGATIVE_INFINITY;
  });

  function drawBackdrop() {
    context!.globalAlpha = 1;
    context!.fillStyle = tokens.pine;
    context!.fillRect(0, 0, width, height);
  }

  function drawCampfire(image: HTMLImageElement) {
    const dest = campfireDest(
      { width, height },
      {
        width: image.naturalWidth || image.width,
        height: image.naturalHeight || image.height,
      },
    );
    context!.imageSmoothingEnabled = false;
    context!.drawImage(image, dest.x, dest.y, dest.width, dest.height);
  }

  function drawCity(blend: number) {
    context!.globalAlpha = blend;
    context!.fillStyle = tokens.background;
    context!.fillRect(0, 0, width, height);
    context!.fillStyle = tokens.primary;
    context!.textAlign = "center";
    context!.textBaseline = "middle";
    const size = Math.round(72 * (width / 320) * (0.94 + 0.06 * blend));
    context!.font = `700 ${size}px ${options.fontFamily}`;
    context!.fillText(options.cityName, width / 2, height / 2);
    context!.globalAlpha = 1;
  }

  return {
    texture,
    draw(now, blend, motion) {
      if (!ready) {
        if (lastDraw === Number.NEGATIVE_INFINITY) {
          drawBackdrop();
          texture.needsUpdate = true;
          lastDraw = now;
          return true;
        }
        return false;
      }
      const frameIndex = motion
        ? Math.floor(now / CAMPFIRE_FRAME_MS) % frames.length
        : 0;
      if (!motion && blend === 0 && drewStill) return false;
      if (
        motion &&
        blend === lastBlend &&
        frameIndex === lastFrame &&
        now - lastDraw < CAMPFIRE_FRAME_MS
      )
        return false;
      lastDraw = now;
      lastBlend = blend;
      lastFrame = frameIndex;
      drewStill = !motion;
      drawBackdrop();
      const image =
        !motion && still ? still : (frames[frameIndex] ?? frames[0]);
      if (image) drawCampfire(image);
      if (blend > 0) drawCity(blend);
      texture.needsUpdate = true;
      return true;
    },
    dispose() {
      cancelled = true;
      texture.dispose();
    },
  };
}

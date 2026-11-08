import * as THREE from "three";
import type { SceneTokens } from "@/lib/home-scene";

export type BackdropSide = "developer" | "partner";

export type BackdropField = {
  group: THREE.Group;
  /** Ease toward 0 (rest) or 1 (hovered) each frame. */
  setTarget(intensity: number): void;
  /** Advances the hover ease; returns true when another frame is wanted. */
  update(now: number, motion: boolean): boolean;
  dispose(): void;
};

type Billboard = {
  mesh: THREE.Mesh;
  baseY: number;
  baseScale: number;
  restOpacity: number;
  hoverOpacity: number;
  phase: number;
};

const TREE_URL = "/sprites/tree-4.svg";
const GRASS_URLS = ["/sprites/grass-1.svg", "/sprites/grass-2.svg"] as const;
const FLOWER_URLS = ["/sprites/flower-1.svg", "/sprites/flower-2.svg"] as const;

function plane(
  map: THREE.Texture,
  width: number,
  height: number,
  x: number,
  y: number,
  z: number,
  opacity: number,
) {
  const material = new THREE.MeshBasicMaterial({
    map,
    transparent: true,
    opacity,
    depthWrite: false,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.position.set(x, y, z);
  mesh.renderOrder = -2;
  return mesh;
}

function loadTexture(url: string): Promise<THREE.Texture | null> {
  return new Promise((resolve) => {
    const loader = new THREE.TextureLoader();
    loader.load(
      url,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        texture.generateMipmaps = false;
        resolve(texture);
      },
      undefined,
      () => resolve(null),
    );
  });
}

/** Soft glyphs drawn on canvas so the developer side stays token-coloured. */
function drawTechGlyph(
  tokens: SceneTokens,
  kind: "brackets" | "braces" | "chip" | "prompt",
): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d")!;
  context.clearRect(0, 0, size, size);
  context.strokeStyle = tokens.primary;
  context.fillStyle = tokens.primary;
  context.lineWidth = 10;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.font = `700 120px ${getComputedStyle(document.documentElement).getPropertyValue("--app-font-mono").trim() || "monospace"}`;
  context.textAlign = "center";
  context.textBaseline = "middle";

  if (kind === "brackets") {
    context.beginPath();
    context.moveTo(78, 56);
    context.lineTo(48, 56);
    context.lineTo(48, 200);
    context.lineTo(78, 200);
    context.moveTo(178, 56);
    context.lineTo(208, 56);
    context.lineTo(208, 200);
    context.lineTo(178, 200);
    context.stroke();
    context.fillStyle = tokens.apricot;
    context.beginPath();
    context.moveTo(96, 128);
    context.lineTo(128, 104);
    context.lineTo(160, 128);
    context.lineTo(128, 152);
    context.closePath();
    context.fill();
  } else if (kind === "braces") {
    context.fillText("{ }", size / 2, size / 2 + 8);
  } else if (kind === "chip") {
    context.strokeRect(56, 72, 144, 112);
    for (const [x, y] of [
      [56, 96],
      [56, 128],
      [56, 160],
      [200, 96],
      [200, 128],
      [200, 160],
      [96, 72],
      [128, 72],
      [160, 72],
      [96, 184],
      [128, 184],
      [160, 184],
    ] as const) {
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(
        x < 128 ? x - 18 : x > 128 ? x + 18 : x,
        y < 128 ? y - 18 : y > 128 ? y + 18 : y,
      );
      context.stroke();
    }
    context.fillStyle = tokens.mint;
    context.fillRect(88, 100, 80, 56);
  } else {
    context.fillStyle = tokens.pine;
    context.fillText(">_ ", size / 2 - 8, size / 2 + 8);
    context.fillStyle = tokens.apricot;
    context.fillRect(158, 108, 18, 36);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

function makeField(
  group: THREE.Group,
  billboards: Billboard[],
  side: BackdropSide,
): BackdropField {
  let current = 0;
  let target = 0;
  return {
    group,
    setTarget(intensity) {
      target = Math.max(0, Math.min(1, intensity));
    },
    update(now, motion) {
      const next = current + (target - current) * 0.12;
      const settled = Math.abs(next - target) < 0.002;
      current = settled ? target : next;
      const seconds = now / 1000;
      for (const billboard of billboards) {
        const material = billboard.mesh.material as THREE.MeshBasicMaterial;
        const bob =
          motion && current > 0.01
            ? Math.sin(seconds * 2.2 + billboard.phase) * 0.02 * current
            : 0;
        billboard.mesh.position.y = billboard.baseY + bob + current * 0.04;
        const scale = billboard.baseScale * (1 + current * 0.12);
        billboard.mesh.scale.set(scale, scale, 1);
        material.opacity =
          billboard.restOpacity +
          (billboard.hoverOpacity - billboard.restOpacity) * current;
      }
      // Soft lateral lean away from the monitor when hovered.
      group.rotation.y =
        (side === "developer" ? 1 : -1) * THREE.MathUtils.degToRad(4 * current);
      return !settled || (motion && current > 0.01);
    },
    dispose() {
      // Geometry and materials are disposed by the scene traverse.
    },
  };
}

/** Pixel trees and garden accents behind the partner's wooden chair. */
export async function buildPartnerBackdrop(
  tokens: SceneTokens,
): Promise<BackdropField | null> {
  const group = new THREE.Group();
  group.position.set(1.35, 0, -0.55);
  group.userData.backdrop = "partner";
  const billboards: Billboard[] = [];
  const tree = await loadTexture(TREE_URL);
  if (!tree) return null;

  const placements = [
    { x: -0.35, y: 0.95, z: -0.15, w: 0.85, h: 2.2, opacity: 0.42 },
    { x: 0.45, y: 0.78, z: 0.05, w: 0.7, h: 1.8, opacity: 0.36 },
    { x: 0.05, y: 0.88, z: -0.35, w: 0.55, h: 1.45, opacity: 0.3 },
  ];
  placements.forEach((placement, index) => {
    const mesh = plane(
      tree,
      placement.w,
      placement.h,
      placement.x,
      placement.y,
      placement.z,
      placement.opacity,
    );
    group.add(mesh);
    billboards.push({
      mesh,
      baseY: placement.y,
      baseScale: 1,
      restOpacity: placement.opacity,
      hoverOpacity: Math.min(0.92, placement.opacity + 0.38),
      phase: index * 1.3,
    });
  });

  for (const [index, url] of GRASS_URLS.entries()) {
    const texture = await loadTexture(url);
    if (!texture) continue;
    const x = -0.55 + index * 0.7;
    const mesh = plane(texture, 0.55, 0.28, x, 0.14, 0.2, 0.45);
    group.add(mesh);
    billboards.push({
      mesh,
      baseY: 0.14,
      baseScale: 1,
      restOpacity: 0.45,
      hoverOpacity: 0.85,
      phase: 2 + index,
    });
  }
  for (const [index, url] of FLOWER_URLS.entries()) {
    const texture = await loadTexture(url);
    if (!texture) continue;
    const mesh = plane(
      texture,
      0.28,
      0.28,
      -0.2 + index * 0.55,
      0.22,
      0.28,
      0.4,
    );
    group.add(mesh);
    billboards.push({
      mesh,
      baseY: 0.22,
      baseScale: 1,
      restOpacity: 0.4,
      hoverOpacity: 0.9,
      phase: 4 + index,
    });
  }

  return makeField(group, billboards, "partner");
}

/** Canvas-drawn tech marks behind the developer's task chair. */
export function buildDeveloperBackdrop(tokens: SceneTokens): BackdropField {
  const group = new THREE.Group();
  group.position.set(-1.35, 0, -0.55);
  group.userData.backdrop = "developer";
  const billboards: Billboard[] = [];
  const glyphs = [
    {
      kind: "brackets" as const,
      x: -0.15,
      y: 1.05,
      z: -0.1,
      size: 0.72,
      opacity: 0.38,
    },
    {
      kind: "braces" as const,
      x: 0.4,
      y: 0.7,
      z: 0.05,
      size: 0.55,
      opacity: 0.32,
    },
    {
      kind: "chip" as const,
      x: -0.45,
      y: 0.55,
      z: 0.12,
      size: 0.48,
      opacity: 0.34,
    },
    {
      kind: "prompt" as const,
      x: 0.15,
      y: 1.35,
      z: -0.25,
      size: 0.5,
      opacity: 0.3,
    },
  ];
  glyphs.forEach((glyph, index) => {
    const texture = drawTechGlyph(tokens, glyph.kind);
    const mesh = plane(
      texture,
      glyph.size,
      glyph.size,
      glyph.x,
      glyph.y,
      glyph.z,
      glyph.opacity,
    );
    // Face the camera a little so flat marks read on the angled chair.
    mesh.rotation.y = THREE.MathUtils.degToRad(12);
    group.add(mesh);
    billboards.push({
      mesh,
      baseY: glyph.y,
      baseScale: 1,
      restOpacity: glyph.opacity,
      hoverOpacity: Math.min(0.95, glyph.opacity + 0.42),
      phase: index * 0.9,
    });
  });
  return makeField(group, billboards, "developer");
}

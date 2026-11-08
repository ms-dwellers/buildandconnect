import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { rgbaFromHex } from "@/lib/home-scene";

export type Materials = {
  fabric: THREE.Material;
  cushion: THREE.Material;
  wood: THREE.Material;
  woodEdge: THREE.Material;
  metal: THREE.Material;
  metalEdge: THREE.Material;
  bezel: THREE.Material;
};

const degrees = (value: number) => (value * Math.PI) / 180;

function box(
  width: number,
  height: number,
  depth: number,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  radius = 0,
) {
  const geometry =
    radius > 0
      ? new RoundedBoxGeometry(
          width,
          height,
          depth,
          3,
          Math.min(radius, Math.min(width, height, depth) / 2),
        )
      : new THREE.BoxGeometry(width, height, depth);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  return mesh;
}

function cylinder(
  radiusTop: number,
  radiusBottom: number,
  height: number,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 20),
    material,
  );
  mesh.position.set(x, y, z);
  return mesh;
}

function sphere(
  radius: number,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 12, 8),
    material,
  );
  mesh.position.set(x, y, z);
  return mesh;
}

/** The developer's seat: a modern task chair on a five-star base. */
export function buildTaskChair(materials: Materials) {
  const group = new THREE.Group();
  group.userData.id = "developer";
  group.add(box(0.46, 0.07, 0.46, materials.fabric, 0, 0.48, 0, 0.03));
  const back = box(0.44, 0.5, 0.06, materials.fabric, 0, 0.8, -0.21, 0.03);
  back.rotation.x = -degrees(6);
  group.add(back);
  group.add(box(0.06, 0.26, 0.04, materials.metal, 0, 0.56, -0.23));
  group.add(cylinder(0.09, 0.09, 0.02, materials.metalEdge, 0, 0.44, 0));
  group.add(cylinder(0.03, 0.03, 0.33, materials.metal, 0, 0.27, 0));
  for (let index = 0; index < 5; index++) {
    const angle = (index / 5) * Math.PI * 2;
    const arm = box(
      0.3,
      0.03,
      0.04,
      materials.metal,
      Math.cos(angle) * 0.15,
      0.06,
      Math.sin(angle) * 0.15,
    );
    arm.rotation.y = -angle;
    group.add(arm);
    group.add(
      sphere(
        0.03,
        materials.metalEdge,
        Math.cos(angle) * 0.3,
        0.03,
        Math.sin(angle) * 0.3,
      ),
    );
  }
  for (const side of [-1, 1]) {
    group.add(
      box(
        0.05,
        0.03,
        0.28,
        materials.metalEdge,
        side * 0.25,
        0.72,
        -0.02,
        0.01,
      ),
    );
    group.add(box(0.03, 0.2, 0.04, materials.metal, side * 0.25, 0.61, 0));
  }
  return group;
}

/**
 * The partner's seat: a simple wooden café chair with a wheat cushion. The
 * rear legs and back posts are single pieces and every leg is vertical, so
 * nothing kinks at the seat or pokes through it.
 */
export function buildWoodenChair(materials: Materials) {
  const group = new THREE.Group();
  group.userData.id = "partner";
  group.add(box(0.44, 0.05, 0.44, materials.wood, 0, 0.46, 0, 0.015));
  group.add(box(0.4, 0.03, 0.4, materials.cushion, 0, 0.5, 0, 0.012));
  for (const side of [-1, 1]) {
    group.add(box(0.04, 0.47, 0.04, materials.wood, side * 0.19, 0.235, 0.19));
    group.add(box(0.04, 0.93, 0.04, materials.wood, side * 0.19, 0.465, -0.19));
  }
  group.add(box(0.44, 0.06, 0.04, materials.wood, 0, 0.9, -0.19, 0.012));
  group.add(box(0.34, 0.035, 0.025, materials.wood, 0, 0.72, -0.19));
  group.add(box(0.34, 0.035, 0.025, materials.wood, 0, 0.6, -0.19));
  return group;
}

/** A low side table that carries the monitor between the chairs. */
export function buildSideTable(materials: Materials) {
  const group = new THREE.Group();
  group.add(box(0.9, 0.04, 0.5, materials.wood, 0, 0.7, 0, 0.01));
  for (const [sx, sz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ])
    group.add(
      box(0.035, 0.68, 0.035, materials.wood, sx * 0.39, 0.34, sz * 0.19),
    );
  return group;
}

/** Monitor with a 16:10 screen plane at local z = 0.019 in front of the bezel. */
export function buildMonitor(materials: Materials, screen: THREE.Material) {
  const group = new THREE.Group();
  group.userData.id = "monitor";
  group.add(box(0.34, 0.02, 0.2, materials.bezel, 0, 0.73, 0));
  // The neck sits behind the panel so it never shows through the screen.
  group.add(box(0.07, 0.3, 0.04, materials.bezel, 0, 0.89, -0.045));
  group.add(box(1.06, 0.69, 0.035, materials.bezel, 0, 1.15, 0, 0.02));
  const display = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.625), screen);
  display.position.set(0, 1.15, 0.019);
  group.add(display);
  return group;
}

/**
 * A baked contact shadow. Nothing in the scene moves except the camera, so a
 * soft radial gradient under each object is exact and costs nothing per frame.
 */
export function buildContactShadow(
  width: number,
  depth: number,
  hex: string,
  x: number,
  z: number,
): THREE.Mesh | null {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (!context) return null;
  const gradient = context.createRadialGradient(64, 64, 4, 64, 64, 64);
  gradient.addColorStop(0, rgbaFromHex(hex, 0.38));
  gradient.addColorStop(0.55, rgbaFromHex(hex, 0.16));
  gradient.addColorStop(1, rgbaFromHex(hex, 0));
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.002, z);
  mesh.renderOrder = -1;
  return mesh;
}

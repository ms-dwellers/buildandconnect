import * as THREE from "three";
import { shadeHex, type SceneTokens } from "@/lib/home-scene";
import { instanceAutumnTree, loadAutumnTreeTemplate } from "./autumn-tree";
import { buildContactShadow } from "./furniture";

export type PartnerFoliage = "pine" | "autumn";

export type BackdropSide = "developer" | "partner";

export type BackdropField = {
  group: THREE.Group;
  /** Ease toward 0 (rest) or 1 (hovered) each frame. */
  setTarget(intensity: number): void;
  /** Re-run the sprout animation (used when autumn trees finish loading). */
  nudge(): void;
  /** Advances sprouting, hover ease, and motion; true when more frames are wanted. */
  update(now: number, motion: boolean): boolean;
  dispose(): void;
};

/** One sprouting item: a tree, a bush, or a floating mark. */
type Sprout = {
  group: THREE.Group;
  baseScale: number;
  baseY: number;
  baseYaw: number;
  /** Milliseconds after the field first renders before this item sprouts. */
  delay: number;
  phase: number;
};

/** A material whose colour deepens from `rest` to `hover` with the field. */
type Tint = {
  material: THREE.MeshStandardMaterial;
  rest: THREE.Color;
  hover: THREE.Color;
};

const SPROUT_MS = 720;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const degrees = (value: number) => (value * Math.PI) / 180;

/** Ease-out with a small overshoot, so things spring up rather than slide. */
function backOut(t: number) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}

function tint(
  rest: string,
  hover: string,
  extra: THREE.MeshStandardMaterialParameters = {},
): Tint {
  const restColor = new THREE.Color(rest);
  return {
    material: new THREE.MeshStandardMaterial({
      color: restColor.clone(),
      roughness: 0.82,
      metalness: 0,
      flatShading: true,
      ...extra,
    }),
    rest: restColor,
    hover: new THREE.Color(hover),
  };
}

function mesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
) {
  const item = new THREE.Mesh(geometry, material);
  item.position.set(x, y, z);
  return item;
}

function makeField(
  group: THREE.Group,
  items: Sprout[],
  tints: Tint[],
  side: BackdropSide,
): BackdropField {
  let current = 0;
  let target = 0;
  let born: number | null = null;
  return {
    group,
    setTarget(intensity) {
      target = clamp01(intensity);
    },
    nudge() {
      born = null;
    },
    update(now, motion) {
      if (born === null) born = now;
      const next = current + (target - current) * 0.12;
      const settled = Math.abs(next - target) < 0.002;
      current = settled ? target : next;
      const seconds = now / 1000;
      const lift = 1 + current * 0.14;
      let growing = false;
      for (const item of items) {
        const t = motion ? clamp01((now - born - item.delay) / SPROUT_MS) : 1;
        if (t < 1) growing = true;
        const grow = t >= 1 ? 1 : Math.max(0.001, backOut(t));
        const spread = 0.55 + 0.45 * Math.min(1, grow);
        item.group.scale.set(
          item.baseScale * spread * lift,
          item.baseScale * grow * lift,
          item.baseScale * spread * lift,
        );
        if (side === "partner") {
          // Wind: a gentle lean that strengthens when the side is hovered.
          item.group.rotation.z = motion
            ? Math.sin(seconds * 1.3 + item.phase) *
              degrees(1.2 + 2.6 * current)
            : 0;
        } else {
          // Marks hover in place and turn, faster and higher when hovered.
          item.group.position.y =
            item.baseY +
            (motion
              ? Math.sin(seconds * 1.6 + item.phase) * (0.03 + 0.05 * current)
              : 0);
          item.group.rotation.y = motion
            ? item.baseYaw +
              Math.sin(seconds * (0.35 + 0.9 * current) + item.phase) *
                degrees(22 + 20 * current)
            : item.baseYaw;
        }
      }
      for (const entry of tints)
        entry.material.color.lerpColors(entry.rest, entry.hover, current);
      return (
        growing ||
        !settled ||
        (motion && (current > 0.01 || side === "developer"))
      );
    },
    dispose() {
      // Geometries and materials are disposed by the scene traverse.
    },
  };
}

/** A low-poly pine: a short trunk and three stacked cones. */
function buildPine(
  height: number,
  trunk: THREE.Material,
  foliage: THREE.Material[],
) {
  const tree = new THREE.Group();
  const unit = height / 1.6;
  const trunkHeight = 0.3 * unit;
  tree.add(
    mesh(
      new THREE.CylinderGeometry(0.035 * unit, 0.05 * unit, trunkHeight, 7),
      trunk,
      0,
      trunkHeight / 2,
      0,
    ),
  );
  const radii = [0.3, 0.24, 0.17];
  const heights = [0.5, 0.44, 0.4];
  let y = trunkHeight * 0.7;
  radii.forEach((radius, index) => {
    const coneHeight = heights[index] * unit;
    tree.add(
      mesh(
        new THREE.ConeGeometry(radius * unit, coneHeight, 7),
        foliage[index],
        0,
        y + coneHeight / 2,
        0,
      ),
    );
    y += coneHeight * 0.58;
  });
  return tree;
}

const PARTNER_TREE_SLOTS = [
  { x: 1.85, z: -0.95, height: 1.9 },
  { x: 2.35, z: -0.45, height: 1.45 },
  { x: 2.75, z: -1.25, height: 2.2 },
  { x: 3.2, z: -0.7, height: 1.7 },
  { x: 3.7, z: -1.1, height: 2.05 },
  { x: 4.15, z: -0.5, height: 1.55 },
  { x: 4.7, z: -1.3, height: 2.3 },
  { x: 5.2, z: -0.8, height: 1.8 },
  { x: 5.8, z: -1.15, height: 2.1 },
  { x: 6.4, z: -0.6, height: 1.65 },
  { x: 7.0, z: -1.2, height: 2.2 },
  { x: 7.6, z: -0.75, height: 1.85 },
] as const;

function plantPines(
  group: THREE.Group,
  items: Sprout[],
  tokens: SceneTokens,
  trunk: Tint,
  foliage: Tint[],
) {
  PARTNER_TREE_SLOTS.forEach((slot, index) => {
    const tree = buildPine(
      slot.height,
      trunk.material,
      foliage.map((entry) => entry.material),
    );
    tree.position.set(slot.x, 0, slot.z);
    tree.rotation.y = degrees((index * 47) % 360);
    const shadow = buildContactShadow(
      slot.height * 0.42,
      slot.height * 0.42,
      tokens.shadow,
      0,
      0,
    );
    if (shadow) tree.add(shadow);
    group.add(tree);
    items.push({
      group: tree,
      baseScale: 1,
      baseY: 0,
      baseYaw: tree.rotation.y,
      delay: 120 + index * 85,
      phase: index * 1.1,
    });
  });
}

/**
 * Trees behind the partner chair. Community keeps procedural pines; Developer
 * swaps in the low-poly autumn GLB (with a pine fallback if loading fails).
 */
export function buildPartnerBackdrop(
  tokens: SceneTokens,
  foliage: PartnerFoliage = "pine",
): BackdropField {
  const group = new THREE.Group();
  group.userData.backdrop = "partner";
  const items: Sprout[] = [];
  const trunk = tint(tokens.shadow, tokens.woodEdge);
  const pineFoliage = [
    tint(tokens.teal, tokens.pine),
    tint(shadeHex(tokens.teal, 0.25), tokens.emerald),
    tint(tokens.mint, shadeHex(tokens.emerald, 0.2)),
  ];
  const autumn =
    foliage === "autumn"
      ? {
          orange: tint(tokens.apricot, shadeHex(tokens.coral, -0.1)),
          yellow: tint(tokens.wheat, tokens.apricot),
          brown: tint(tokens.woodEdge, tokens.shadow),
        }
      : null;
  const bush = autumn
    ? tint(shadeHex(tokens.apricot, -0.05), shadeHex(tokens.coral, -0.15))
    : tint(shadeHex(tokens.mint, 0.1), shadeHex(tokens.teal, -0.1));
  const accent = autumn ? autumn.yellow : pineFoliage[2]!;
  const tints = autumn
    ? [autumn.orange, autumn.yellow, autumn.brown, bush]
    : [trunk, ...pineFoliage, bush];

  const bushes = [
    { x: 2.0, z: -0.25, size: 0.42 },
    { x: 2.95, z: -0.15, size: 0.36 },
    { x: 3.95, z: -0.3, size: 0.46 },
    { x: 5.05, z: -0.2, size: 0.4 },
    { x: 6.15, z: -0.3, size: 0.44 },
  ];
  bushes.forEach((entry, index) => {
    const shrub = new THREE.Group();
    shrub.add(
      mesh(
        new THREE.ConeGeometry(entry.size * 0.5, entry.size, 6),
        bush.material,
        0,
        entry.size / 2,
        0,
      ),
    );
    shrub.add(
      mesh(
        new THREE.ConeGeometry(entry.size * 0.36, entry.size * 0.8, 6),
        accent.material,
        entry.size * 0.4,
        entry.size * 0.4,
        entry.size * 0.2,
      ),
    );
    shrub.position.set(entry.x, 0, entry.z);
    group.add(shrub);
    items.push({
      group: shrub,
      baseScale: 1,
      baseY: 0,
      baseYaw: 0,
      delay: 60 + index * 70,
      phase: 3 + index,
    });
  });

  const field = makeField(group, items, tints, "partner");
  if (autumn) {
    void loadAutumnTreeTemplate()
      .then((template) => {
        PARTNER_TREE_SLOTS.forEach((slot, index) => {
          const tree = instanceAutumnTree(template, {
            orange: autumn.orange.material,
            yellow: autumn.yellow.material,
            brown: autumn.brown.material,
          });
          tree.position.set(slot.x, 0, slot.z);
          tree.rotation.y = degrees((index * 47) % 360);
          const shadow = buildContactShadow(
            slot.height * 0.42,
            slot.height * 0.42,
            tokens.shadow,
            0,
            0,
          );
          if (shadow) tree.add(shadow);
          group.add(tree);
          items.push({
            group: tree,
            baseScale: slot.height,
            baseY: 0,
            baseYaw: tree.rotation.y,
            delay: 80 + index * 70,
            phase: index * 1.1,
          });
        });
        field.nudge();
      })
      .catch(() => {
        plantPines(group, items, tokens, trunk, pineFoliage);
        field.nudge();
      });
  } else {
    plantPines(group, items, tokens, trunk, pineFoliage);
  }
  return field;
}

type MarkKind =
  "brackets" | "braces" | "chip" | "terminal" | "diamond" | "gear" | "dots";

/** A thin bar used to build the line-art marks. */
function bar(length: number, thickness: number, material: THREE.Material) {
  return new THREE.Mesh(
    new THREE.BoxGeometry(length, thickness, thickness),
    material,
  );
}

function chevron(size: number, material: THREE.Material, direction: 1 | -1) {
  const shape = new THREE.Group();
  const arm = size * 0.62;
  const thickness = size * 0.13;
  const upper = bar(arm, thickness, material);
  upper.position.set(0, size * 0.22, 0);
  upper.rotation.z = direction * degrees(-40);
  const lower = bar(arm, thickness, material);
  lower.position.set(0, -size * 0.22, 0);
  lower.rotation.z = direction * degrees(40);
  shape.add(upper, lower);
  return shape;
}

function brace(size: number, material: THREE.Material, direction: 1 | -1) {
  const shape = new THREE.Group();
  const tube = size * 0.075;
  const radius = size * 0.2;
  const upper = new THREE.Mesh(
    new THREE.TorusGeometry(radius, tube, 8, 14, Math.PI),
    material,
  );
  upper.position.set(0, radius, 0);
  upper.rotation.z = direction > 0 ? Math.PI / 2 : -Math.PI / 2;
  const lower = new THREE.Mesh(
    new THREE.TorusGeometry(radius, tube, 8, 14, Math.PI),
    material,
  );
  lower.position.set(0, -radius, 0);
  lower.rotation.z = direction > 0 ? Math.PI / 2 : -Math.PI / 2;
  const nub = bar(size * 0.18, tube * 2, material);
  nub.position.set(-direction * radius * 0.9, 0, 0);
  shape.add(upper, lower, nub);
  return shape;
}

function buildMark(
  kind: MarkKind,
  size: number,
  ink: THREE.Material,
  accent: THREE.Material,
) {
  const mark = new THREE.Group();
  if (kind === "brackets") {
    const left = chevron(size, ink, -1);
    left.position.x = -size * 0.42;
    const right = chevron(size, ink, 1);
    right.position.x = size * 0.42;
    const slash = bar(size * 0.62, size * 0.12, accent);
    slash.rotation.z = degrees(68);
    mark.add(left, right, slash);
  } else if (kind === "braces") {
    const left = brace(size, ink, -1);
    left.position.x = -size * 0.4;
    const right = brace(size, ink, 1);
    right.position.x = size * 0.4;
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(size * 0.08, 10, 8),
      accent,
    );
    mark.add(left, right, dot);
  } else if (kind === "chip") {
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(size * 0.72, size * 0.72, size * 0.12),
      ink,
    );
    const core = new THREE.Mesh(
      new THREE.BoxGeometry(size * 0.3, size * 0.3, size * 0.04),
      accent,
    );
    core.position.z = size * 0.08;
    mark.add(body, core);
    for (let index = 0; index < 4; index++) {
      const offset = (index - 1.5) * size * 0.17;
      for (const side of [-1, 1]) {
        const pinX = bar(size * 0.16, size * 0.04, ink);
        pinX.position.set(side * size * 0.44, offset, 0);
        const pinY = bar(size * 0.16, size * 0.04, ink);
        pinY.rotation.z = Math.PI / 2;
        pinY.position.set(offset, side * size * 0.44, 0);
        mark.add(pinX, pinY);
      }
    }
  } else if (kind === "terminal") {
    const width = size;
    const height = size * 0.68;
    const thickness = size * 0.07;
    const top = bar(width, thickness, ink);
    top.position.y = height / 2;
    const bottom = bar(width, thickness, ink);
    bottom.position.y = -height / 2;
    const left = bar(height, thickness, ink);
    left.rotation.z = Math.PI / 2;
    left.position.x = -width / 2;
    const right = bar(height, thickness, ink);
    right.rotation.z = Math.PI / 2;
    right.position.x = width / 2;
    const prompt = chevron(size * 0.36, ink, 1);
    prompt.position.set(-size * 0.22, 0, thickness);
    const cursor = bar(size * 0.26, thickness, accent);
    cursor.position.set(size * 0.14, -size * 0.1, thickness);
    mark.add(top, bottom, left, right, prompt, cursor);
  } else if (kind === "diamond") {
    mark.add(new THREE.Mesh(new THREE.OctahedronGeometry(size * 0.36), accent));
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(size * 0.5, size * 0.03, 6, 24),
      ink,
    );
    ring.rotation.x = Math.PI / 2;
    mark.add(ring);
  } else if (kind === "gear") {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(size * 0.3, size * 0.1, 8, 20),
      ink,
    );
    mark.add(ring);
    for (let index = 0; index < 8; index++) {
      const angle = (index / 8) * Math.PI * 2;
      const tooth = new THREE.Mesh(
        new THREE.BoxGeometry(size * 0.15, size * 0.15, size * 0.15),
        ink,
      );
      tooth.position.set(
        Math.cos(angle) * size * 0.44,
        Math.sin(angle) * size * 0.44,
        0,
      );
      tooth.rotation.z = angle;
      mark.add(tooth);
    }
    mark.add(
      new THREE.Mesh(new THREE.SphereGeometry(size * 0.11, 10, 8), accent),
    );
  } else {
    for (let row = 0; row < 3; row++)
      for (let column = 0; column < 3; column++) {
        const lit = (row + column) % 2 === 0;
        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(size * (lit ? 0.09 : 0.06), 10, 8),
          lit ? accent : ink,
        );
        dot.position.set((column - 1) * size * 0.3, (row - 1) * size * 0.3, 0);
        mark.add(dot);
      }
  }
  return mark;
}

/**
 * Low-poly tech marks floating behind the developer's task chair, running off
 * the left edge of the screen. Rest colours are quiet metal and mint; hovering
 * brightens them to pine and apricot and makes them turn faster.
 */
export function buildDeveloperBackdrop(tokens: SceneTokens): BackdropField {
  const group = new THREE.Group();
  group.userData.backdrop = "developer";
  const ink = tint(shadeHex(tokens.metal, 0.35), tokens.pine, {
    roughness: 0.5,
    metalness: 0.25,
    flatShading: false,
  });
  const accent = tint(tokens.mint, tokens.apricot, {
    roughness: 0.55,
    metalness: 0.1,
    flatShading: false,
  });
  const items: Sprout[] = [];

  const marks: {
    kind: MarkKind;
    x: number;
    y: number;
    z: number;
    size: number;
    yaw: number;
  }[] = [
    { kind: "brackets", x: -1.95, y: 1.45, z: -0.85, size: 0.5, yaw: 18 },
    { kind: "braces", x: -2.55, y: 0.72, z: -0.4, size: 0.44, yaw: -12 },
    { kind: "chip", x: -2.4, y: 1.95, z: -1.25, size: 0.46, yaw: 24 },
    { kind: "terminal", x: -3.25, y: 1.2, z: -0.95, size: 0.58, yaw: 14 },
    { kind: "diamond", x: -3.05, y: 0.42, z: -0.3, size: 0.34, yaw: 0 },
    { kind: "gear", x: -3.95, y: 1.8, z: -1.35, size: 0.46, yaw: -20 },
    { kind: "dots", x: -4.35, y: 0.82, z: -0.6, size: 0.42, yaw: 16 },
    { kind: "brackets", x: -4.95, y: 1.42, z: -1.05, size: 0.4, yaw: -16 },
    { kind: "braces", x: -5.65, y: 0.7, z: -0.5, size: 0.48, yaw: 10 },
    { kind: "chip", x: -6.35, y: 1.55, z: -1.15, size: 0.42, yaw: -24 },
    { kind: "terminal", x: -7.1, y: 1.0, z: -0.8, size: 0.52, yaw: 12 },
  ];
  marks.forEach((entry, index) => {
    const mark = buildMark(
      entry.kind,
      entry.size,
      ink.material,
      accent.material,
    );
    mark.position.set(entry.x, entry.y, entry.z);
    mark.rotation.y = degrees(entry.yaw);
    group.add(mark);
    items.push({
      group: mark,
      baseScale: 1,
      baseY: entry.y,
      baseYaw: mark.rotation.y,
      delay: 100 + index * 70,
      phase: index * 0.9,
    });
  });

  return makeField(group, items, [ink, accent], "developer");
}

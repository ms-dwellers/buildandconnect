import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { mapClouds } from "../lib/map-clouds.ts";

const css = readFileSync(
  new URL("../components/map/map.css", import.meta.url),
  "utf8",
);

test("the cloud veil stays opaque for navigation and fades away on reveal", () => {
  for (const [name, from, to] of [
    ["cloud-cover", 0, 1],
    ["clouds-unveil", 1, 0],
  ] as const) {
    const keyframes = css.match(
      new RegExp(`@keyframes ${name}\\s*\\{([\\s\\S]*?)\\n\\}`),
    )?.[1];
    assert.ok(keyframes, `Missing ${name} animation`);
    assert.match(keyframes, new RegExp(`from\\s*\\{\\s*opacity: ${from}`));
    assert.match(keyframes, new RegExp(`to\\s*\\{\\s*opacity: ${to}`));
    assert.doesNotMatch(keyframes, /transform|translate|scale/);
  }
  assert.match(css, /animation: cloud-cover var\(--map-cover-duration\)/);
  assert.match(css, /animation: clouds-unveil var\(--map-reveal-duration\)/);
  assert.match(css, /\.cloud-veil\s*\{[^}]*background: var\(--cloud\)/);
});

test("small clouds enter from opposite sides and reveal with diagonal parallax", () => {
  assert.match(css, /--cloud-travel-x: -110vw/);
  assert.match(css, /--cloud-travel-x: 110vw/);
  for (const name of ["map-clouds-gather", "map-clouds-part"]) {
    const keyframes = css.match(
      new RegExp(`@keyframes ${name}\\s*\\{([\\s\\S]*?)\\n\\}`),
    )?.[1];
    assert.ok(keyframes);
    assert.match(
      keyframes,
      /translate3d\(var\(--cloud-travel-x\), var\(--cloud-travel-y\), 0\)/,
    );
    assert.match(keyframes, /translate3d\(0, 0, 0\)/);
  }
  const speeds = [...css.matchAll(/--cloud-speed:\s*([\d.]+);/g)].map((match) =>
    Number(match[1]),
  );
  const delays = [...css.matchAll(/--cloud-delay:\s*([\d.]+);/g)].map((match) =>
    Number(match[1]),
  );
  assert.equal(new Set(speeds).size, 3);
  assert.deepEqual(
    speeds.map((speed, index) => Number((speed + delays[index]).toFixed(2))),
    [1, 0.83, 0.6],
  );
});

test("map clouds remain small and preserve sprite aspect ratios", () => {
  const sprite = css.match(/\.map-cloud-sprite\s*\{([^}]+)\}/)?.[1];
  assert.ok(sprite);
  assert.match(
    sprite,
    /width: calc\(var\(--cloud-width\) \* var\(--cloud-scale\)\)/,
  );
  assert.match(sprite, /height: auto/);
  assert.match(sprite, /image-rendering: pixelated/);
  assert.match(css, /--cloud-width: clamp\(100px, 19vw, 280px\)/);
  assert.doesNotMatch(css, /--map-cloud-scale/);
});

test("seeded variation covers every grid cell in wide and portrait layouts", () => {
  assert.equal(mapClouds.length, 56);
  assert.equal(new Set(mapClouds.map((cloud) => cloud.id)).size, 56);
  assert.equal(new Set(mapClouds.map((cloud) => cloud.sprite.name)).size, 6);
  assert.equal(new Set(mapClouds.map((cloud) => cloud.depth)).size, 3);
  for (const cloud of mapClouds) {
    assert.ok(cloud.offsetX >= 25 && cloud.offsetX < 75);
    assert.ok(cloud.offsetY >= 25 && cloud.offsetY < 75);
    assert.ok(cloud.scale >= 0.8 && cloud.scale < 1.2);
    assert.ok(Math.abs(cloud.travelY) <= 30);
    const svg = readFileSync(
      new URL(`../public/sprites/${cloud.sprite.name}.svg`, import.meta.url),
      "utf8",
    );
    assert.ok(
      svg.includes(
        `width="${cloud.sprite.width}" height="${cloud.sprite.height}"`,
      ),
    );
  }
  assert.match(css, /grid-template-columns: repeat\(8, 1fr\)/);
  assert.match(css, /grid-template-rows: repeat\(7, 1fr\)/);
  assert.match(css, /grid-template-columns: repeat\(4, 1fr\)/);
  assert.match(css, /grid-template-rows: repeat\(14, 1fr\)/);
});

test("reveal completion follows the veil, not the first fast foreground cloud", () => {
  const journey = readFileSync(
    new URL("../components/map/map-journey.tsx", import.meta.url),
    "utf8",
  );
  assert.match(
    journey,
    /classList\.contains\("cloud-veil"\) &&\s+event\.animationName === "clouds-unveil"/,
  );
  assert.doesNotMatch(journey, /classList\.contains\("map-cloud-bank/);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

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

test("large cloud banks enter from opposite sides and part again", () => {
  assert.match(css, /--cloud-travel: -120vw/);
  assert.match(css, /--cloud-travel: 120vw/);
  for (const name of ["map-clouds-gather", "map-clouds-part"]) {
    const keyframes = css.match(
      new RegExp(`@keyframes ${name}\\s*\\{([\\s\\S]*?)\\n\\}`),
    )?.[1];
    assert.ok(keyframes);
    assert.match(keyframes, /translateX\(var\(--cloud-travel\)\)/);
    assert.match(keyframes, /translateX\(0\)/);
  }
});

test("map cloud artwork uses whole-number scaling without changing aspect ratios", () => {
  const sprite = css.match(/\.map-cloud-sprite\s*\{([^}]+)\}/)?.[1];
  assert.ok(sprite);
  assert.match(
    sprite,
    /width: calc\(var\(--sprite-width\) \* var\(--map-cloud-scale\)\)/,
  );
  assert.match(
    sprite,
    /height: calc\(var\(--sprite-height\) \* var\(--map-cloud-scale\)\)/,
  );
  assert.match(sprite, /image-rendering: pixelated/);
  const scales = [...css.matchAll(/--map-cloud-scale:\s*([^;]+);/g)];
  assert.ok(scales.length > 0);
  for (const [, scale] of scales) assert.match(scale, /^\d+$/);
});

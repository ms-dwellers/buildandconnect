import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(
  new URL("../components/map/map.css", import.meta.url),
  "utf8",
);

test("map cloud cover fades in and out without zooming or sliding", () => {
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
  assert.match(css, /animation: cloud-cover var\(--map-fade-in\)/);
  assert.match(css, /animation: clouds-unveil var\(--map-fade-out\)/);
});

test("map cloud sprites are bounded by the viewport without resizing the artwork", () => {
  const sprite = css.match(/\.map-cloud-sprite\s*\{([^}]+)\}/)?.[1];
  assert.ok(sprite);
  assert.match(sprite, /calc\(100% - var\(--cloud-width\)\)/);
  assert.match(sprite, /calc\(100% - var\(--cloud-height\)\)/);
  assert.match(sprite, /image-rendering: pixelated/);
  assert.doesNotMatch(sprite, /(?:^|\s)(?:width|height|transform):/);
});

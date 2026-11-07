import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

const spriteDirectory = new URL("../public/sprites/", import.meta.url);

test("the full supplied sprite collection is kept as local SVG assets", () => {
  const files = readdirSync(spriteDirectory).filter((file) =>
    file.endsWith(".svg"),
  );
  assert.equal(files.length, 22);
  for (const file of files) {
    const svg = readFileSync(new URL(file, spriteDirectory), "utf8");
    assert.match(svg, /<svg\s/);
    assert.doesNotMatch(svg, /<script\b|<foreignObject\b|\bonload\s*=/i);
    assert.doesNotMatch(svg, /(?:href|src)=["']https?:/i);
  }
  for (const file of [
    "ground-1.svg",
    "cloud-1.svg",
    "cloud-2.svg",
    "cloud-3.svg",
    "foreground-cloud-1.svg",
    "foreground-cloud-2.svg",
    "foreground-cloud-3.svg",
    "large-cloud.svg",
    "tree-1.svg",
    "tree-2.svg",
    "tree-3.svg",
    "tree-4.svg",
  ])
    assert.ok(files.includes(file), `Missing scene asset: ${file}`);
});

test("cloud artwork uses whole-number scales and has a reduced-motion escape", () => {
  const css = readFileSync(
    new URL("../components/landing/hero-scene.css", import.meta.url),
    "utf8",
  );
  const scales = [...css.matchAll(/--cloud-scale:\s*([^;]+);/g)];
  assert.ok(scales.length > 0);
  for (const [, scale] of scales) assert.match(scale, /^\d+$/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /pointer-events:\s*none/);
  assert.match(css, /image-rendering:\s*pixelated/);
});

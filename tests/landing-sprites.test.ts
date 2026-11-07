import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { landingClouds } from "../lib/landing-clouds.ts";

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

test("drifting clouds use native dimensions, slow varied speeds, and both directions", () => {
  assert.equal(new Set(landingClouds.map((cloud) => cloud.direction)).size, 2);
  assert.equal(
    new Set(landingClouds.map((cloud) => cloud.seconds)).size,
    landingClouds.length,
  );
  for (const cloud of landingClouds) {
    const svg = readFileSync(
      new URL(`${cloud.sprite}.svg`, spriteDirectory),
      "utf8",
    );
    assert.match(svg, new RegExp(`width="${cloud.width}"`));
    assert.match(svg, new RegExp(`height="${cloud.height}"`));
    assert.ok(cloud.seconds >= 120);
    assert.ok(cloud.delay < 0 && -cloud.delay < cloud.seconds);
  }
});

test("clouds loop fully offscreen, support pausing, and respect reduced motion", () => {
  const css = readFileSync(
    new URL("../components/landing/hero-scene.css", import.meta.url),
    "utf8",
  );
  assert.match(css, /left:\s*calc\(-1 \* var\(--cloud-width\)\)/);
  assert.match(css, /width:\s*calc\(100% \+ var\(--cloud-width\)\)/);
  assert.match(css, /animation:\s*hero-cloud-drift linear infinite/);
  assert.match(css, /animation-play-state:\s*paused/);
  assert.doesNotMatch(css, /hero-cloud-reveal|--cloud-scale/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /pointer-events:\s*none/);
  assert.match(css, /image-rendering:\s*pixelated/);
});

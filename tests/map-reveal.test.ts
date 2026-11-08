import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  revealProgress,
  revealResolution,
  revealTiming,
} from "../lib/map-reveal.ts";

test("reveal progress is bounded, smooth and finishes at the configured deadline", () => {
  for (const duration of Object.values(revealTiming)) {
    assert.equal(revealProgress(-1, duration), 0);
    assert.equal(revealProgress(0, duration), 0);
    assert.equal(revealProgress(duration / 2, duration), 0.5);
    assert.equal(revealProgress(duration, duration), 1);
    assert.equal(revealProgress(duration * 2, duration), 1);
    assert.ok(revealProgress(duration / 10, duration) < 0.1);
  }
});

test("shader resolution is bounded regardless of screen size or pixel density", () => {
  for (const [width, height] of [
    [390, 844],
    [2000, 1290],
    [3840, 2160],
    [0, 0],
  ]) {
    const size = revealResolution(width, height);
    assert.ok(size.width >= 1 && size.width <= 768);
    assert.ok(size.height >= 1 && size.height <= 512);
    if (width > 0)
      assert.ok(Math.abs(size.width / size.height - width / height) < 0.005);
  }
});

test("map transition removes sprite stacks and stops drawing after each phase", () => {
  const component = readFileSync(
    new URL("../components/map/map-reveal.tsx", import.meta.url),
    "utf8",
  );
  const journey = readFileSync(
    new URL("../components/map/map-journey.tsx", import.meta.url),
    "utf8",
  );
  const css = readFileSync(
    new URL("../components/map/map.css", import.meta.url),
    "utf8",
  );
  assert.match(component, /context\.drawArrays\(context\.TRIANGLES, 0, 3\)/);
  assert.match(component, /if \(amount < 1\) frame = requestAnimationFrame/);
  assert.match(component, /stopped \|\| document\.hidden/);
  assert.match(component, /context\.deleteProgram/);
  assert.match(component, /webglcontextlost/);
  assert.match(journey, /<MapReveal/);
  assert.doesNotMatch(
    journey + css,
    /map-cloud|cloud-veil|MapClouds|\/sprites\//,
  );
});

test("fallback and renderer completion share the same navigation lifecycle", () => {
  const component = readFileSync(
    new URL("../components/map/map-reveal.tsx", import.meta.url),
    "utf8",
  );
  const journey = readFileSync(
    new URL("../components/map/map-journey.tsx", import.meta.url),
    "utf8",
  );
  assert.match(component, /current\.onComplete\(\)/);
  assert.match(component, /onAnimationEnd/);
  assert.match(component, /setAvailable\(false\)/);
  assert.match(journey, /setTimeout\(navigateToMap, COVER_MS \+ 500\)/);
  assert.match(journey, /REVEAL_MS \+ 250/);
});

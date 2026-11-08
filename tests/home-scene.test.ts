import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { CITY_NAME } from "../lib/calgary-area.ts";
import { homeCopy } from "../lib/home-copy.ts";
import {
  CAMPFIRE_FRAME_COUNT,
  CAMPFIRE_FRAME_MS,
  CAMPFIRE_FRAME_SRCS,
  CAMPFIRE_STILL_SRC,
  SCENE,
  SCREEN_TEXTURE,
  approachProgress,
  approachTiming,
  cameraRig,
  campfireDest,
  createEmbers,
  dollyPose,
  emberPosition,
  flameOutline,
  normalizeHex,
  parseHexToken,
  readSceneTokens,
  restPose,
  sceneResolution,
  screenBlend,
  screenPose,
  shadeHex,
  stepEmbers,
} from "../lib/home-scene.ts";

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("the approach dolly is short, eased, and crossfades the screen late", () => {
  assert.ok(approachTiming.dolly >= 900 && approachTiming.dolly <= 1200);
  assert.ok(0.4 < approachTiming.cityFrom);
  assert.ok(approachTiming.cityFrom < approachTiming.cityTo);
  assert.ok(approachTiming.cityTo < 0.9);
  assert.equal(approachProgress(-10, 1000), 0);
  assert.equal(approachProgress(0, 1000), 0);
  assert.equal(approachProgress(500, 1000), 0.5);
  assert.equal(approachProgress(1000, 1000), 1);
  assert.equal(approachProgress(5000, 1000), 1);
  let previous = -1;
  for (let step = 0; step <= 20; step++) {
    const value = approachProgress((step / 20) * 1000, 1000);
    assert.ok(value > previous, "progress is strictly increasing");
    previous = value;
  }
  assert.equal(screenBlend(approachTiming.cityFrom), 0);
  assert.equal(screenBlend(approachTiming.cityTo), 1);
  assert.ok(screenBlend(0.65) > 0 && screenBlend(0.65) < 1);
  assert.ok(screenBlend(0.7) > screenBlend(0.6));
});

test("the camera rig frames both chairs and the floor at every aspect ratio", () => {
  for (const aspect of [0.46, 0.9, 1.33, 1.78, 3.2]) {
    const rig = cameraRig(aspect);
    assert.ok(
      rig.halfWidth >= SCENE.halfWidth - 1e-9,
      `chairs fit at ${aspect}`,
    );
    assert.ok(rig.distance >= SCENE.minDistance);
    const bottom = rig.lookAtY - rig.halfHeight;
    const top = rig.lookAtY + rig.halfHeight;
    assert.ok(bottom < 0, "the floor line is inside the frame");
    assert.ok(top > SCENE.objectTop, "the tallest object is inside the frame");
    const rest = restPose(rig);
    assert.deepEqual(rest.position, [0, rig.cameraY, rig.distance]);
    assert.deepEqual(rest.target, [0, rig.lookAtY, 0]);
  }
  assert.ok(cameraRig(0.9).distance > cameraRig(1.78).distance);
  assert.equal(cameraRig(Number.NaN).distance, cameraRig(1).distance);
});

test("the dolly moves straight toward the screen and ends in front of it", () => {
  const aspect = 1.78;
  const rig = cameraRig(aspect);
  const [sx, sy, sz] = SCENE.screen.center;
  const distanceToScreen = (point: readonly number[]) =>
    Math.hypot(point[0] - sx, point[1] - sy, point[2] - sz);
  assert.deepEqual(dollyPose(0, rig, aspect), restPose(rig));
  const end = dollyPose(1, rig, aspect);
  assert.deepEqual(end, screenPose(rig, aspect));
  assert.deepEqual(end.target, [sx, sy, sz]);
  assert.ok(end.position[2] > sz && end.position[2] < 1.5);
  let previous = Number.POSITIVE_INFINITY;
  for (let step = 0; step <= 10; step++) {
    const distance = distanceToScreen(
      dollyPose(step / 10, rig, aspect).position,
    );
    assert.ok(distance < previous, "the camera keeps approaching the screen");
    previous = distance;
  }
});

test("token parsing accepts every hex form the CSS minifier emits and rejects the rest", () => {
  const apricot = parseHexToken("#f0a345");
  assert.ok(apricot);
  assert.ok(Math.abs(apricot[0] - 240 / 255) < 1e-9);
  assert.ok(Math.abs(apricot[1] - 163 / 255) < 1e-9);
  assert.ok(Math.abs(apricot[2] - 69 / 255) < 1e-9);
  assert.deepEqual(parseHexToken(" #FFFFFF "), [1, 1, 1]);
  // Lightning CSS shortens #ffffff to #fff in production builds.
  assert.deepEqual(parseHexToken("#fff"), [1, 1, 1]);
  assert.equal(normalizeHex(" #FFF "), "#ffffff");
  assert.equal(normalizeHex("#f0a345ff"), "#f0a345");
  assert.equal(normalizeHex("#abcd"), "#aabbcc");
  for (const value of [
    "",
    "color-mix(in oklab, red, blue)",
    "var(--x)",
    "#ff",
    "#fffff",
    "rgb(1 2 3)",
  ]) {
    assert.equal(parseHexToken(value), null, value);
    assert.equal(normalizeHex(value), null, value);
  }
  assert.equal(readSceneTokens(() => "#fff")?.background, "#ffffff");
  assert.equal(shadeHex("#ffffff", -0.5), "#808080");
  assert.equal(shadeHex("#000000", 1), "#ffffff");
  assert.equal(shadeHex("not-a-colour", -0.5), "not-a-colour");
  const complete = readSceneTokens(() => "#123456");
  assert.ok(complete);
  assert.equal(Object.keys(complete).length, 17);
  assert.equal(
    readSceneTokens((name) => (name === "--scene-wood" ? "" : "#123456")),
    null,
  );
});

test("the monitor campfire ships discrete frames and fits the screen", () => {
  assert.equal(CAMPFIRE_FRAME_COUNT, 5);
  assert.equal(CAMPFIRE_FRAME_MS, 100);
  assert.equal(CAMPFIRE_FRAME_SRCS.length, CAMPFIRE_FRAME_COUNT);
  for (const src of [...CAMPFIRE_FRAME_SRCS, CAMPFIRE_STILL_SRC]) {
    assert.ok(
      existsSync(new URL(`../public${src}`, import.meta.url)),
      `${src} must ship`,
    );
  }
  const dest = campfireDest(
    { width: SCREEN_TEXTURE.width, height: SCREEN_TEXTURE.height },
    { width: 320, height: 320 },
  );
  assert.ok(dest.width <= SCREEN_TEXTURE.width * 0.76);
  assert.ok(dest.height <= SCREEN_TEXTURE.height * 0.76);
  assert.ok(dest.x > 0 && dest.y > 0);
  assert.equal(
    Math.round(dest.x + dest.width / 2),
    Math.round(SCREEN_TEXTURE.width / 2),
  );
  // Procedural flame helpers remain available for the idle ember math tests.
  assert.deepEqual(createEmbers(12, 7), createEmbers(12, 7));
  assert.notDeepEqual(createEmbers(12, 7), createEmbers(12, 8));
  const embers = createEmbers(12, 7);
  for (let frame = 0; frame < 600; frame++) stepEmbers(embers, 1 / 24);
  stepEmbers(embers, Number.POSITIVE_INFINITY);
  for (const ember of embers) {
    assert.ok(ember.y >= 0 && ember.y <= 1);
    const point = emberPosition(ember, 3.2);
    assert.ok(point.x > 0 && point.x < 1);
    assert.ok(point.y > 0 && point.y < 1);
    assert.ok(point.alpha >= 0 && point.alpha <= 1);
  }
  for (let time = 0; time <= 10; time += 0.25) {
    for (const layer of [0, 1, 2] as const) {
      const flame = flameOutline(time, layer);
      assert.ok(flame.tipY > 0 && flame.tipY < flame.baseY);
      assert.ok(flame.baseX - flame.halfWidth > 0);
      assert.ok(flame.baseX + flame.halfWidth < SCREEN_TEXTURE.width);
      assert.ok(flame.tipX > 0 && flame.tipX < SCREEN_TEXTURE.width);
    }
  }
  assert.ok(flameOutline(1, 0).halfWidth > flameOutline(1, 2).halfWidth);
});

test("the drawing buffer caps pixel density for low-power rendering", () => {
  assert.equal(sceneResolution(1000, 400, 3).ratio, 1.5);
  assert.equal(sceneResolution(1000, 400, 1).ratio, 1);
  assert.ok(sceneResolution(3840, 1000, 2).width <= 1920);
  assert.deepEqual(sceneResolution(0, 0, 0), { width: 1, height: 1, ratio: 1 });
});

test("the landing copy states the purpose and keeps the two paths", () => {
  assert.equal(CITY_NAME, "Calgary");
  assert.match(homeCopy.lead, /Calgary/);
  assert.match(homeCopy.lead, /developers/i);
  assert.match(homeCopy.heading.join(" "), /developers/i);
  assert.equal(homeCopy.ctas.find.href, "/map");
  assert.equal(homeCopy.ctas.post.href, "/requests/new");
  assert.equal(homeCopy.ways.length, 2);
});

test("the home page renders copy on the server and loads three lazily", () => {
  const page = read("app/page.tsx");
  assert.match(page, /className="landing-hero relative isolate w-full/);
  assert.match(page, /<HomeScene \/>/);
  assert.match(page, /landing-hero-copy/);
  assert.doesNotMatch(
    page,
    /HeroScene|JoinGarden|\/sprites\/|landing-paper|bg-secondary"/,
  );
  const wrapper = read("components/landing/home-scene.tsx");
  assert.match(wrapper, /import\("\.\/home-scene\/scene"\)/);
  assert.doesNotMatch(wrapper, /^import .* from "three";/m);
  for (const needle of [
    "webglcontextlost",
    "document.hidden",
    "IntersectionObserver",
    "prefers-reduced-motion: reduce",
    "registerRef.current(null)",
    "dispose()",
  ])
    assert.ok(wrapper.includes(needle), needle);
  const scene = read("components/landing/home-scene/scene.ts");
  assert.match(scene, /forceContextLoss/);
  assert.match(scene, /NoToneMapping/);
  assert.match(scene, /powerPreference: "low-power"/);
  assert.match(scene, /buildDeveloperBackdrop/);
  assert.match(scene, /buildPartnerBackdrop/);
  assert.doesNotMatch(scene, /castShadow\s*=\s*true/);
  const css = read("app/globals.css");
  assert.match(css, /min-height: calc\(100svh - 6rem\)/);
  assert.match(css, /--home-scene-height/);
  // The backdrops are procedural meshes; no sprite assets ship any more.
  const backdrops = read("components/landing/home-scene/backdrops.ts");
  assert.match(backdrops, /ConeGeometry/);
  assert.match(backdrops, /buildPartnerBackdrop/);
  assert.match(backdrops, /buildDeveloperBackdrop/);
  assert.doesNotMatch(backdrops, /TextureLoader|\/sprites\//);
});

test("the scene reads its tokens from the minified production stylesheet", () => {
  const css = read("app/globals.css");
  const declarations = new Map<string, string>();
  const root = css.match(/:root\s*\{([\s\S]*?)\n\}/);
  assert.ok(root, "globals.css must declare :root tokens");
  for (const line of root[1].split("\n")) {
    const match = /^\s*(--[a-z0-9-]+):\s*([^;]+);/.exec(line);
    if (match) declarations.set(match[1], match[2].trim());
  }
  const resolve = (name: string, depth = 0): string => {
    const value = declarations.get(name) ?? "";
    const reference = /^var\((--[a-z0-9-]+)\)$/.exec(value);
    return reference && depth < 8 ? resolve(reference[1], depth + 1) : value;
  };
  const minify = (value: string) =>
    /^#([0-9a-f])\1([0-9a-f])\2([0-9a-f])\3$/i.test(value)
      ? `#${value[1]}${value[3]}${value[5]}`.toLowerCase()
      : value.toLowerCase();
  const tokens = readSceneTokens((name) => minify(resolve(name)));
  assert.ok(tokens, "every scene token must resolve to a hex colour");
  assert.equal(tokens.background, "#ffffff");
  for (const value of Object.values(tokens))
    assert.match(value, /^#[0-9a-f]{6}$/);
});

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { CITY_NAME } from "../lib/calgary-area.ts";
import { homeCopy } from "../lib/home-copy.ts";
import {
  SCENE,
  SCREEN_TEXTURE,
  approachProgress,
  approachTiming,
  cameraRig,
  createEmbers,
  dollyPose,
  emberPosition,
  flameOutline,
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

test("token parsing accepts six-digit hex and rejects everything else", () => {
  const apricot = parseHexToken("#f0a345");
  assert.ok(apricot);
  assert.ok(Math.abs(apricot[0] - 240 / 255) < 1e-9);
  assert.ok(Math.abs(apricot[1] - 163 / 255) < 1e-9);
  assert.ok(Math.abs(apricot[2] - 69 / 255) < 1e-9);
  assert.deepEqual(parseHexToken(" #FFFFFF "), [1, 1, 1]);
  for (const value of [
    "",
    "color-mix(in oklab, red, blue)",
    "var(--x)",
    "#fff",
    "rgb(1 2 3)",
  ])
    assert.equal(parseHexToken(value), null, value);
  assert.equal(shadeHex("#ffffff", -0.5), "#808080");
  assert.equal(shadeHex("#000000", 1), "#ffffff");
  assert.equal(shadeHex("not-a-colour", -0.5), "not-a-colour");
  const complete = readSceneTokens(() => "#123456");
  assert.ok(complete);
  assert.equal(Object.keys(complete).length, 15);
  assert.equal(
    readSceneTokens((name) => (name === "--scene-wood" ? "" : "#123456")),
    null,
  );
});

test("the fire model is deterministic and stays inside the screen", () => {
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
  assert.doesNotMatch(scene, /castShadow\s*=\s*true/);
  const css = read("app/globals.css");
  assert.match(css, /min-height: calc\(100svh - 6rem\)/);
  assert.match(css, /--home-scene-height/);
  assert.equal(
    existsSync(new URL("../public/sprites", import.meta.url)),
    false,
  );
});

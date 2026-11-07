import assert from "node:assert/strict";
import test from "node:test";
import { CALGARY_BOUNDS } from "../lib/calgary.ts";
import { LISTINGS as CALGARY_JOBS } from "./fixtures/listings.ts";
import {
  CITY_MAP_STYLE,
  JOB_SOURCE,
  CLUSTER_LAYER,
  POINT_LAYER,
  cityMapMode,
  cityBounds,
  cityOverviewPadding,
  jobCamera,
  jobFeatures,
  jobLayers,
} from "../lib/calgary-map.ts";

test("the illustrated map is a fallback, never the Mapbox loading screen", () => {
  const pending = { hasToken: true, ready: false, failed: false };
  assert.equal(cityMapMode(pending), "loading");
  assert.equal(cityMapMode({ ...pending, ready: true }), "mapbox");
  assert.equal(cityMapMode({ ...pending, failed: true }), "preview");
  assert.equal(cityMapMode({ ...pending, hasToken: false }), "preview");
  assert.equal(
    cityMapMode({ ...pending, ready: true, failed: true }),
    "preview",
  );
  assert.equal(cityMapMode(pending), "loading", "retry returns to clouds");
});

test("GeoJSON contains all postings, stable identifiers, and no private listing data", () => {
  const data = jobFeatures(CALGARY_JOBS);
  assert.equal(data.type, "FeatureCollection");
  assert.equal(data.features.length, CALGARY_JOBS.length);
  data.features.forEach((feature, index) => {
    const job = CALGARY_JOBS[index];
    assert.equal(feature.id, job.id);
    assert.deepEqual(feature.properties, {
      id: job.id,
      kind: job.kind,
      label: job.source === "request" ? "R" : job.kind === "paid" ? "P" : "V",
    });
    assert.deepEqual(feature.geometry, {
      type: "Point",
      coordinates: [job.longitude, job.latitude],
    });
  });
  assert.deepEqual(jobFeatures([]).features, []);
});
test("selection targets actual coordinates, 3D buildings, and a bounded camera flight", () => {
  assert.equal(CITY_MAP_STYLE, "mapbox://styles/mapbox/standard");
  for (const job of CALGARY_JOBS) {
    const camera = jobCamera(job, false);
    assert.deepEqual(camera.center, [job.longitude, job.latitude]);
    assert.ok(camera.zoom! >= 16 && camera.zoom! <= 19);
    assert.equal(camera.pitch, 60);
    assert.ok(camera.duration! > 0 && camera.duration! <= 2000);
    assert.equal(camera.essential, false);
    assert.equal(jobCamera(job, true).duration, 0);
  }
});
test("overview uses full Calgary bounds and safe padding for varied viewports", () => {
  assert.deepEqual(cityBounds(), CALGARY_BOUNDS);
  const bounds = cityBounds();
  bounds[0][0] = 0;
  assert.notDeepEqual(bounds, cityBounds());
  for (const [width, height] of [
    [320, 432],
    [390, 548],
    [1072, 920],
    [280, 280],
  ]) {
    const padding = cityOverviewPadding(width, height);
    assert.ok(padding.top + padding.bottom < height / 2);
    assert.ok(padding.left + padding.right < width / 2);
    assert.ok(Object.values(padding).every((value) => value >= 0));
  }
});
test("cluster and point layers share a source and include non-colour labels", () => {
  const colors = {
    primary: "primary",
    surface: "surface",
    secondary: "secondary",
    foreground: "foreground",
    primaryForeground: "on-primary",
  };
  const layers = jobLayers(colors);
  assert.equal(new Set(layers.map((layer) => layer.id)).size, layers.length);
  assert.ok(
    layers.every(
      (layer) =>
        "source" in layer &&
        layer.source === JOB_SOURCE &&
        layer.slot === "top",
    ),
  );
  assert.ok(
    layers.some(
      (layer) => layer.id === CLUSTER_LAYER && layer.type === "circle",
    ),
  );
  assert.ok(
    layers.some((layer) => layer.id === POINT_LAYER && layer.type === "circle"),
  );
  const labels = layers.find((layer) => layer.id === `${POINT_LAYER}-label`);
  assert.ok(labels?.type === "symbol");
  assert.deepEqual(labels.layout?.["text-field"], ["get", "label"]);
});

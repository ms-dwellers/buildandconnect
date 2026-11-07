import assert from "node:assert/strict";
import test from "node:test";
import {
  CALGARY_CENTER,
  CALGARY_BOUNDS,
  filterCityJobs,
  isInCalgary,
  previewPoint,
  previewPosition,
  previewViewport,
} from "../lib/calgary.ts";
import { LISTINGS as CALGARY_JOBS } from "./fixtures/listings.ts";

test("the illustrated overview fits every posting even on a narrow screen", () => {
  for (const width of [320, 390, 768, 1200]) {
    const viewport = previewViewport(width, 548);
    for (const job of CALGARY_JOBS) {
      const point = previewPosition(job);
      const x = viewport.left + (point.x / 100) * viewport.width;
      const y = viewport.top + (point.y / 100) * viewport.height;
      assert.ok(x >= 0 && x <= width && y >= 0 && y <= 548);
    }
    assert.deepEqual(previewPoint(0, 0), {
      longitude: CALGARY_BOUNDS[0][0],
      latitude: CALGARY_BOUNDS[1][1],
    });
  }
});
test("Calgary bounds reject other cities and malformed coordinates", () => {
  assert.ok(isInCalgary(CALGARY_CENTER));
  for (const point of [
    { longitude: -79.3832, latitude: 43.6532 },
    { longitude: -114.07, latitude: 52 },
    { longitude: NaN, latitude: 51.04 },
    { longitude: -114.07, latitude: Infinity },
  ])
    assert.equal(isInCalgary(point), false);
});
test("preview coordinates round-trip through map placements", () => {
  for (const job of CALGARY_JOBS) {
    const position = previewPosition(job);
    assert.ok(
      position.x >= 0 &&
        position.x <= 100 &&
        position.y >= 0 &&
        position.y <= 100,
    );
    const point = previewPoint(position.x / 100, position.y / 100);
    assert.ok(Math.abs(point.longitude - job.longitude) < 1e-8);
    assert.ok(Math.abs(point.latitude - job.latitude) < 1e-8);
  }
  assert.ok(isInCalgary(previewPoint(-100, 100)));
});
test("the preview preserves map proportions and brings selected jobs into narrow viewports", () => {
  for (const width of [320, 390, 768, 1200]) {
    for (const job of CALGARY_JOBS) {
      const viewport = previewViewport(width, 548, job);
      const point = previewPosition(job);
      const x = viewport.left + (point.x / 100) * viewport.width;
      const y = viewport.top + (point.y / 100) * viewport.height;
      assert.ok(x >= 0 && x <= width && y >= 0 && y <= 548);
      assert.ok(Math.abs(viewport.width / viewport.height - 1000 / 700) < 1e-8);
    }
  }
});
test("filters separate paid, volunteer, and community listings and search their text", () => {
  const ids = (filter: Parameters<typeof filterCityJobs>[2], query = "") =>
    filterCityJobs(CALGARY_JOBS, query, filter).map((job) => job.id);
  assert.deepEqual(ids("paid"), ["kensington", "evanston", "somerset"]);
  assert.deepEqual(ids("volunteer"), ["tuscany", "west-springs"]);
  assert.deepEqual(ids("request"), ["saddle-ridge", "forest-lawn", "seton"]);
  assert.deepEqual(ids("all", "  DESIGN "), ["kensington"]);
  assert.deepEqual(ids("request", "accessibility"), ["saddle-ridge"]);
  assert.deepEqual(ids("paid", "saddle"), []);
  assert.equal(ids("all").length, CALGARY_JOBS.length);
});

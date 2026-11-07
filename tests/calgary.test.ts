import assert from "node:assert/strict";
import test from "node:test";
import {
  CALGARY_CENTER,
  CALGARY_BOUNDS,
  CALGARY_JOBS,
  filterCityJobs,
  isInCalgary,
  previewPoint,
  previewPosition,
  previewViewport,
} from "../lib/calgary.ts";

test("the demo's jobs are uniquely identified, Calgary-based, and clearly typed", () => {
  assert.equal(
    new Set(CALGARY_JOBS.map((job) => job.id)).size,
    CALGARY_JOBS.length,
  );
  assert.ok(
    CALGARY_JOBS.every(
      (job) =>
        isInCalgary(job) && job.title && job.organization && job.description,
    ),
  );
  assert.ok(CALGARY_JOBS.some((job) => job.kind === "paid"));
  assert.ok(
    CALGARY_JOBS.some((job) => job.kind === "volunteer" && job.mentorship),
  );
});
test("postings cover every quadrant and the north and south edges of the city", () => {
  assert.ok(CALGARY_JOBS.length >= 30);
  for (const north of [true, false]) {
    for (const west of [true, false]) {
      assert.ok(
        CALGARY_JOBS.filter(
          (job) =>
            job.latitude > CALGARY_CENTER.latitude === north &&
            job.longitude < CALGARY_CENTER.longitude === west,
        ).length >= 4,
      );
    }
  }
  assert.ok(CALGARY_JOBS.some((job) => job.latitude > 51.17));
  assert.ok(CALGARY_JOBS.some((job) => job.latitude < 50.89));
  assert.ok(CALGARY_JOBS.some((job) => job.longitude < -114.23));
  assert.ok(CALGARY_JOBS.some((job) => job.longitude > -113.94));
});
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
test("job filters combine type, neighbourhood, organisation, and skill without changing source data", () => {
  assert.equal(filterCityJobs(CALGARY_JOBS, "  REACT ", "volunteer").length, 2);
  assert.equal(
    filterCityJobs(CALGARY_JOBS, "inglewood", "paid")[0].id,
    "inglewood",
  );
  assert.equal(
    filterCityJobs(CALGARY_JOBS, "borrowing", "all")[0].id,
    "bridgeland",
  );
  assert.equal(filterCityJobs(CALGARY_JOBS, "no such job", "all").length, 0);
  assert.equal(
    filterCityJobs(CALGARY_JOBS, "", "all").length,
    CALGARY_JOBS.length,
  );
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { CITY_NAME } from "../lib/calgary-area.ts";
import { CITY_LABEL, formatWeeklyHours } from "../lib/format.ts";

test("weekly hours read the same way everywhere", () => {
  assert.equal(formatWeeklyHours(1), "1 hour/week");
  assert.equal(formatWeeklyHours(10), "10 hours/week");
  assert.equal(CITY_LABEL, `${CITY_NAME}, Alberta`);
});

test("components use the shared wording instead of their own variants", () => {
  const read = (path: string) =>
    readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  for (const path of [
    "components/opportunity-detail.tsx",
    "components/hiring/employer-intake.tsx",
    "components/map/calgary-explorer.tsx",
    "components/map/calgary-canvas.tsx",
  ]) {
    const source = read(path);
    assert.doesNotMatch(source, /hrs ?\/ ?week|hours ?\/ ?week/, path);
    assert.doesNotMatch(source, /Calgary, (AB|Alberta)/, path);
  }
});

import assert from "node:assert/strict";
import test from "node:test";
import { postingDraftFromBrief } from "../backend/hiring/posting.ts";
import { emptyHiringBrief } from "../backend/hiring/schemas.ts";

const brief = {
  ...emptyHiringBrief(),
  title: "Volunteer scheduling",
  description: "Build a scheduling tool for food bank volunteers.",
  technologies: ["React.js"],
  causes: ["Community"],
  communitiesServed: ["Food bank volunteers"],
  workArrangement: "hybrid" as const,
  location: "Downtown Calgary",
  weeklyHours: 5,
  timeline: "Two weekends",
  compensation: {
    kind: "paid" as const,
    currency: "CAD",
    period: "project" as const,
    minimum: 0,
    maximum: 500,
  },
};

test("reviewed brief mapping preserves unknowns and never creates technology gates or false practical agreement", () => {
  const original = structuredClone(brief);
  const result = postingDraftFromBrief(brief);
  assert.deepEqual(brief, original);
  assert.deepEqual(result.reviewedBrief, original);
  assert.deepEqual(result.draft, {
    title: brief.title,
    description: brief.description,
    interests: ["community"],
    essentialTechnologies: [],
    kind: "paid",
    minimumWeeklyHours: 5,
    commitment: "Two weekends",
  });
  assert.deepEqual(result.missingFields.sort(), [
    "city",
    "collaboration",
    "remote",
  ]);
  for (const field of [
    "location",
    "technologies",
    "communitiesServed",
    "compensation",
    "workArrangement",
  ])
    assert.ok(result.unmappedFields.includes(field));
  assert.equal(result.needsMapPin, true);
  assert.equal(result.requiresConfirmation, true);
  assert.equal(result.draft.compensation, undefined);
});

test("mapping respects posting limits without truncating content or silently filling unknowns", () => {
  const result = postingDraftFromBrief({
    ...brief,
    title: "x".repeat(150),
    description: "Short",
    timeline: "x".repeat(100),
    workArrangement: "remote",
    weeklyHours: null,
    compensation: emptyHiringBrief().compensation,
  });
  assert.equal(result.draft.remote, true);
  assert.equal(result.draft.title, undefined);
  assert.equal(result.draft.description, undefined);
  assert.equal(result.draft.kind, undefined);
  assert.equal(result.draft.minimumWeeklyHours, undefined);
  assert.equal(result.draft.commitment, undefined);
  assert.ok(result.unmappedFields.includes("title"));
  assert.ok(result.unmappedFields.includes("description"));
  assert.ok(result.unmappedFields.includes("timeline"));
  assert.equal(result.reviewedBrief.title?.length, 150);
  assert.equal(
    postingDraftFromBrief({ ...brief, workArrangement: "onsite" }).draft.remote,
    false,
  );
});

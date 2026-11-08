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
  assert.equal(result.draft.title, brief.title);
  assert.match(
    result.draft.description!,
    /Who this helps: Food bank volunteers/,
  );
  assert.match(result.draft.description!, /Technology preferences: React.js/);
  assert.match(result.draft.description!, /Work arrangement: hybrid/);
  assert.deepEqual(result.draft.essentialTechnologies, []);
  assert.deepEqual(result.draft.interests, ["community"]);
  assert.equal(result.draft.city, brief.location);
  assert.equal(result.draft.remote, false);
  assert.equal(result.draft.minimumWeeklyHours, 5);
  assert.equal(result.draft.commitment, "5 hrs/week · Two weekends");
  assert.equal(result.draft.compensation, "CAD 0–500 per project");
  assert.deepEqual(result.missingFields, ["collaboration"]);
  assert.deepEqual(result.unmappedFields, []);
  assert.equal(result.needsMapPin, true);
  assert.equal(result.requiresConfirmation, true);
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
  assert.match(result.draft.description!, /Short/);
  assert.equal(result.draft.kind, undefined);
  assert.equal(result.draft.minimumWeeklyHours, undefined);
  assert.equal(result.draft.commitment, undefined);
  assert.ok(result.unmappedFields.includes("title"));
  assert.match(result.draft.description!, /Timeline:/);
  assert.equal(result.reviewedBrief.title?.length, 150);
  assert.equal(
    postingDraftFromBrief({ ...brief, workArrangement: "onsite" }).draft.remote,
    false,
  );
});

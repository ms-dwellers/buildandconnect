import assert from "node:assert/strict";
import test from "node:test";
import { emptyHiringBrief } from "../backend/hiring/schemas.ts";
import { opportunityDraftFromBrief } from "../lib/opportunity-draft.ts";

test("an empty brief becomes a volunteer draft with no invented fields", () => {
  const draft = opportunityDraftFromBrief(emptyHiringBrief());
  assert.deepEqual(draft, { kind: "volunteer", remote: false });
});

test("a filled brief maps onto the opportunity form fields", () => {
  const brief = {
    ...emptyHiringBrief(),
    title: "Volunteer sign-up site",
    description: "A simple site so neighbours can sign up for shifts.",
    technologies: ["React", " react ", "Postgres"],
    causes: ["food security"],
    communitiesServed: ["seniors", "food security"],
    workArrangement: "remote" as const,
    location: "Calgary",
    weeklyHours: 6,
    timeline: "about a month",
    compensation: {
      kind: "paid" as const,
      currency: "CAD",
      period: "project" as const,
      minimum: 1200,
      maximum: 1500,
    },
  };
  const draft = opportunityDraftFromBrief(brief);
  assert.equal(draft.title, brief.title);
  assert.equal(draft.description, brief.description);
  assert.equal(draft.city, "Calgary");
  assert.equal(draft.kind, "paid");
  assert.equal(draft.remote, true);
  assert.equal(draft.collaboration, "async");
  assert.deepEqual(draft.essentialTechnologies, ["React", "react", "Postgres"]);
  assert.deepEqual(draft.interests, ["food security", "seniors"]);
  assert.equal(draft.minimumWeeklyHours, 6);
  assert.equal(draft.commitment, "about a month");
  assert.equal(draft.compensation, "CAD 1200 to 1500 per project");
});

test("on-site and hybrid arrangements map to live and flexible collaboration", () => {
  const base = emptyHiringBrief();
  assert.equal(
    opportunityDraftFromBrief({ ...base, workArrangement: "onsite" })
      .collaboration,
    "sync",
  );
  assert.equal(
    opportunityDraftFromBrief({ ...base, workArrangement: "hybrid" })
      .collaboration,
    "flexible",
  );
  assert.equal(
    opportunityDraftFromBrief({ ...base, workArrangement: "hybrid" }).remote,
    false,
  );
});

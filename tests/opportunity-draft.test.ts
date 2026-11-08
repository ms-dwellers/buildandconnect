import assert from "node:assert/strict";
import test from "node:test";
import { emptyHiringBrief } from "../backend/hiring/schemas.ts";
import { opportunityDraftFromBrief } from "../lib/opportunity-draft.ts";

const brief = {
  ...emptyHiringBrief(),
  title: "Community calendar",
  description: "A searchable events calendar for older adults.",
  technologies: ["React", "TypeScript"],
  causes: ["community", "digital inclusion"],
  communitiesServed: ["older adults"],
  workArrangement: "remote" as const,
  location: "Calgary",
  weeklyHours: 10,
  timeline: "Six weeks",
  compensation: {
    kind: "paid" as const,
    currency: "CAD",
    period: "project" as const,
    minimum: 1500,
    maximum: 2500,
  },
};

test("a reviewed brief prefills project details without promoting preferences to requirements", () => {
  const draft = opportunityDraftFromBrief(brief);
  assert.equal(draft.title, brief.title);
  assert.equal(draft.city, "Calgary");
  assert.equal(draft.remote, true);
  assert.equal(draft.kind, "paid");
  assert.equal(draft.compensation, "CAD 1,500–2,500 per project");
  assert.equal(draft.minimumWeeklyHours, 10);
  assert.equal(draft.commitment, "10 hrs/week · Six weeks");
  assert.deepEqual(draft.interests, brief.causes);
  assert.deepEqual(draft.essentialTechnologies, []);
  assert.match(draft.description!, /A searchable events calendar/);
  assert.match(draft.description!, /Technology preferences: React, TypeScript/);
  assert.match(draft.description!, /Who this helps: older adults/);
  assert.match(draft.description!, /Work arrangement: remote/);
  assert.equal(draft.collaboration, undefined);
  assert.equal(draft.latitude, undefined);
});

test("unknown brief fields do not invent money, hours, a city, or paid/volunteer status", () => {
  const draft = opportunityDraftFromBrief(emptyHiringBrief());
  assert.equal(draft.kind, undefined);
  assert.equal(draft.compensation, undefined);
  assert.equal(draft.minimumWeeklyHours, undefined);
  assert.equal(draft.remote, undefined);
  assert.equal(draft.city, "");
  assert.equal(draft.title, "");
});

test("draft mapping preserves bounds, zero amounts, long text and hybrid arrangements", () => {
  assert.equal(
    opportunityDraftFromBrief({
      ...brief,
      compensation: { ...brief.compensation, minimum: 0, maximum: 0 },
    }).compensation,
    "CAD 0 per project",
  );
  assert.equal(
    opportunityDraftFromBrief({
      ...brief,
      compensation: { ...brief.compensation, minimum: null },
    }).compensation,
    "CAD up to 2,500 per project",
  );
  assert.equal(
    opportunityDraftFromBrief({
      ...brief,
      compensation: { ...brief.compensation, maximum: null },
    }).compensation,
    "CAD from 1,500 per project",
  );
  const long = opportunityDraftFromBrief({
    ...brief,
    title: "x".repeat(150),
    timeline: "Six weeks, followed by ".repeat(8),
    workArrangement: "hybrid",
  });
  assert.equal(long.title?.length, 150);
  assert.equal(long.commitment, "10 hrs/week");
  assert.match(long.description!, /Timeline: Six weeks, followed by/);
  assert.match(long.description!, /Work arrangement: hybrid/);
  assert.equal(long.remote, false);
  const volunteer = opportunityDraftFromBrief({
    ...brief,
    compensation: { ...brief.compensation, kind: "volunteer" },
  });
  assert.equal(volunteer.kind, "volunteer");
  assert.equal(volunteer.compensation, undefined);
});

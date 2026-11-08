import assert from "node:assert/strict";
import test from "node:test";
import {
  emptyProjectDraft,
  projectDraftContentSchema,
  projectDraftFromBrief,
  opportunityFromDraft,
} from "../backend/project-drafts.ts";
import { emptyHiringBrief } from "../backend/hiring/schemas.ts";
import { requestEligibility } from "../backend/matching.ts";
import { developer, analysis, embedding } from "./fixtures/matching.ts";

test("drafts preserve incomplete edits but cannot publish without required details", () => {
  const draft = emptyProjectDraft();
  assert.equal(projectDraftContentSchema.safeParse(draft).success, true);
  assert.throws(() => opportunityFromDraft(draft));
  assert.equal(
    projectDraftContentSchema.safeParse({ ...draft, ownerId: "other" }).success,
    false,
  );
  const complete = {
    ...draft,
    title: "Garden calendar",
    description: "Build an accessible calendar for community garden events.",
    city: "Toronto",
    kind: "volunteer" as const,
    minimumWeeklyHours: "4",
  };
  assert.equal(opportunityFromDraft(complete).minimumWeeklyHours, 4);
  assert.equal(opportunityFromDraft(complete).kind, "volunteer");
});

test("voice fields carry into the single publishing form without inventing a pin", () => {
  const content = projectDraftFromBrief({
    ...emptyHiringBrief(),
    title: "Food bank",
    description: "Build a volunteer scheduler for the community food bank.",
    technologies: ["React"],
    communitiesServed: ["Volunteers"],
    weeklyHours: 6,
    location: "Calgary",
  });
  assert.equal(content.title, "Food bank");
  assert.equal(content.minimumWeeklyHours, "6");
  assert.match(content.description, /Technology preferences: React/);
  assert.match(content.description, /Who this helps: Volunteers/);
  assert.equal(content.pin, null);
  assert.equal(content.essentialTechnologies, "");
  assert.equal(content.kind, "");
});

test("request review explains missing profile prerequisites and out-of-radius work", () => {
  const request = {
    id: "request",
    ownerId: "requester",
    ownerName: "Requester",
    title: "Project",
    description: "A community project needing useful work",
    place: "Toronto",
    latitude: 43.6532,
    longitude: -79.3832,
    analysis,
    embedding,
    status: "open" as const,
    claimedBy: null,
    claimantName: null,
    createdAt: 1,
  };
  assert.deepEqual(requestEligibility(request, developer), []);
  assert.ok(
    requestEligibility(request, { ...developer, location: null }).includes(
      "Set your search area first",
    ),
  );
  assert.ok(
    requestEligibility(request, {
      ...developer,
      location: { latitude: 51, longitude: -114, radiusKm: 5 },
    }).includes("This request is outside your search radius"),
  );
  assert.ok(
    requestEligibility(
      { ...request, status: "claimed", claimedBy: "other" },
      developer,
    ).includes("This request is no longer open"),
  );
});

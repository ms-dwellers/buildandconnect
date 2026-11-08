import assert from "node:assert/strict";
import test from "node:test";
import { careerTargetSchema } from "../backend/career/schemas.ts";
import { scoreCareerProject } from "../backend/career/matching.ts";
import { activitiesSchema } from "../backend/schemas.ts";
import {
  emptyProjectDraft,
  opportunityFromDraft,
} from "../backend/project-drafts.ts";
import { developer, opportunity } from "./fixtures/matching.ts";

const target = careerTargetSchema.parse({
  title: "Frontend developer",
  sourceText:
    "Build accessible React interfaces and have five years of experience.",
  requirements: [
    {
      id: "requirement-1",
      description: "Build accessible interfaces",
      skills: ["react", "accessibility"],
      sourceQuote: "Build accessible React interfaces",
    },
    {
      id: "requirement-2",
      description: "Five years of experience",
      skills: [],
      sourceQuote: "five years of experience",
    },
  ],
});

test("career evidence quotes must appear in the original source", () => {
  assert.equal(
    careerTargetSchema.safeParse({
      ...target,
      requirements: [
        { ...target.requirements[0], sourceQuote: "Invented requirement" },
      ],
    }).success,
    false,
  );
});

test("private career browsing does not grant discovery consent or turn tenure into practice", () => {
  const privateDeveloper = { ...developer, discoverable: false };
  const result = scoreCareerProject(target, privateDeveloper, opportunity);
  assert.ok(result);
  assert.equal(privateDeveloper.discoverable, false);
  assert.deepEqual(
    result.requirementLinks.map((item) => item.requirementId),
    ["requirement-1"],
  );
  assert.ok(
    result.actionIneligibleReasons.includes("Not available for discovery"),
  );
  assert.deepEqual(result.requirementLinks[0].activityLinks, []);
});

test("concrete activities are linked to requirements without fabricating legacy activities", () => {
  const activities = [
    {
      id: "activity-1",
      description: "Build a keyboard accessible calendar",
      skills: ["accessibility"],
    },
  ];
  const result = scoreCareerProject(target, developer, {
    ...opportunity,
    analysis: { ...opportunity.analysis, activities },
  });
  assert.deepEqual(result?.requirementLinks[0].activityLinks, [
    { activityId: "activity-1", skills: ["accessibility"] },
  ]);
  assert.equal(
    activitiesSchema.safeParse([...activities, ...activities]).success,
    false,
  );
});

test("incomplete private drafts cannot be published as opportunities", () => {
  assert.throws(() => opportunityFromDraft(emptyProjectDraft()));
  const complete = {
    ...emptyProjectDraft(),
    title: opportunity.title,
    description: opportunity.description,
    city: opportunity.city,
    kind: "volunteer" as const,
    minimumWeeklyHours: "5",
    essentialTechnologies: "react",
    remote: true,
  };
  assert.equal(opportunityFromDraft(complete).minimumWeeklyHours, 5);
  assert.throws(() =>
    opportunityFromDraft({ ...complete, minimumWeeklyHours: "not a number" }),
  );
});

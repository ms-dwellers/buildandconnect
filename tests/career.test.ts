import assert from "node:assert/strict";
import test from "node:test";
import { analyzeCareerTarget } from "../backend/career/analysis.ts";
import { AnalysisUnavailable } from "../backend/ai.ts";
import { analysisSchema } from "../backend/schemas.ts";
import {
  careerTargetSchema,
  careerTargetInputSchema,
} from "../backend/career/schemas.ts";
import { careerTarget } from "./fixtures/career.ts";
import { analysis, developer, opportunity } from "./fixtures/matching.ts";
import {
  careerSkillGaps,
  scoreCareerProject,
} from "../backend/career/matching.ts";

test("career extraction validates original quotes, canonical skills, and unique requirement IDs", async () => {
  const ai = {
    async run() {
      return {
        response: JSON.stringify({
          title: careerTarget.title,
          requirements: careerTarget.requirements.map((item) => ({
            ...item,
            skills: item.id === "react" ? ["React.js"] : item.skills,
          })),
        }),
      };
    },
  } as unknown as Ai;
  const result = await analyzeCareerTarget(ai, {
    sourceText: careerTarget.sourceText,
  });
  assert.deepEqual(result, careerTarget);
  assert.equal(
    careerTargetSchema.safeParse({
      ...careerTarget,
      developerId: "someone-else",
    }).success,
    false,
  );
  assert.equal(
    careerTargetSchema.safeParse({
      ...careerTarget,
      requirements: [
        careerTarget.requirements[0],
        careerTarget.requirements[0],
      ],
    }).success,
    false,
  );
  for (const sourceUrl of ["file:///etc/passwd", "javascript:alert(1)"])
    assert.equal(
      careerTargetInputSchema.safeParse({
        sourceText: careerTarget.sourceText,
        sourceUrl,
      }).success,
      false,
    );
});

test("career extraction fails closed on unavailable AI, malformed output, and fabricated quotes", async () => {
  await assert.rejects(
    analyzeCareerTarget(undefined, { sourceText: careerTarget.sourceText }),
    AnalysisUnavailable,
  );
  for (const response of [
    "not JSON",
    {},
    {
      title: careerTarget.title,
      requirements: [
        { ...careerTarget.requirements[0], sourceQuote: "Invented experience" },
      ],
    },
  ]) {
    const ai = {
      async run() {
        return { response };
      },
    } as unknown as Ai;
    await assert.rejects(
      analyzeCareerTarget(ai, { sourceText: careerTarget.sourceText }),
      AnalysisUnavailable,
    );
  }
});

test("project activities are additive, normalized, and uniquely addressable", () => {
  assert.equal(analysisSchema.safeParse(analysis).success, true);
  const activity = {
    id: "build-interface",
    description: "Build a React interface",
    skills: ["React.js"],
  };
  assert.deepEqual(
    analysisSchema.parse({ ...analysis, activities: [activity] })
      .activities?.[0].skills,
    ["react"],
  );
  assert.equal(
    analysisSchema.safeParse({ ...analysis, activities: [activity, activity] })
      .success,
    false,
  );
  assert.equal(
    analysisSchema.safeParse({
      ...analysis,
      activities: [{ ...activity, skills: [] }],
    }).success,
    false,
  );
});

test("career links connect requirements to concrete activities without awarding credentials", () => {
  const project = {
    ...opportunity,
    analysis: {
      ...analysis,
      activities: [
        {
          id: "typed-forms",
          description: "Build typed volunteer forms",
          skills: ["typescript"],
        },
        {
          id: "staff-login",
          description: "Implement staff login",
          skills: ["authentication"],
        },
      ],
    },
  };
  const result = scoreCareerProject(
    careerTarget,
    { ...developer, wantsToLearn: [] },
    project,
  )!;
  assert.equal(result.careerRelevance.gapRequirementsWithPractice, 2);
  assert.deepEqual(
    result.requirementLinks.find(
      (link) => link.requirementId === "authentication",
    )?.activityLinks,
    [{ activityId: "staff-login", skills: ["authentication"] }],
  );
  assert.deepEqual(result.unaddressedRequirementIds, ["degree"]);
  const gaps = careerSkillGaps(careerTarget, developer);
  assert.equal(
    gaps.find((gap) => gap.id === "react")?.evidenceStatus,
    "self_reported",
  );
  assert.equal(
    gaps.find((gap) => gap.id === "degree")?.evidenceStatus,
    "needs_evidence",
  );
  assert.equal(
    gaps.find((gap) => gap.id === "authentication")?.evidenceStatus,
    "needs_evidence",
  );
});

test("legacy projects retain skill-level relevance without fabricated activities", () => {
  const match = scoreCareerProject(careerTarget, developer, opportunity)!;
  assert.equal(match.careerRelevance.gapRequirementsWithPractice, 1);
  assert.ok(
    match.requirementLinks.every((link) => link.activityLinks.length === 0),
  );
  assert.ok(match.unaddressedRequirementIds.includes("authentication"));
});

test("private exploration preserves actionable consent and existing practical eligibility gates", () => {
  const privateDeveloper = { ...developer, discoverable: false };
  const match = scoreCareerProject(
    careerTarget,
    privateDeveloper,
    opportunity,
  )!;
  assert.ok(
    match.actionIneligibleReasons.includes("Not available for discovery"),
  );
  for (const change of [
    { available: false },
    { weeklyHours: 1 },
    { acceptsVolunteer: false },
    { city: "Calgary" },
  ])
    assert.equal(
      scoreCareerProject(
        careerTarget,
        { ...developer, ...change },
        opportunity,
      ),
      null,
    );
  assert.equal(
    scoreCareerProject(careerTarget, developer, {
      ...opportunity,
      essentialTechnologies: ["rust"],
    }),
    null,
  );
  assert.equal(
    scoreCareerProject(careerTarget, developer, {
      ...opportunity,
      status: "closed",
    }),
    null,
  );
});

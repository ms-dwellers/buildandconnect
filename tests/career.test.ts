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
import { analysis } from "./fixtures/matching.ts";

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

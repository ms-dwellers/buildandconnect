import assert from "node:assert/strict";
import test from "node:test";
import {
  analyzeDeveloper,
  analyzeOpportunity,
  AnalysisUnavailable,
  ANALYSIS_MODEL,
  EMBEDDING_MODEL,
  type AIService,
} from "../backend/ai.ts";
import {
  analysis,
  embedding,
  developer,
  opportunity,
} from "./fixtures/matching.ts";

function modelFixture(response: unknown, vector: unknown = embedding) {
  const calls: { model: string; input: unknown }[] = [];
  // Emulate only the external run boundary; the production parsers stay real.
  const ai = {
    async run(model: string, input: unknown) {
      calls.push({ model, input });
      return model === ANALYSIS_MODEL ? { response } : { data: [vector] };
    },
  } as AIService;
  return { ai, calls };
}

test("job extraction requests a JSON schema and validates model output before embedding", async () => {
  const fixture = modelFixture(JSON.stringify(analysis));
  const result = await analyzeOpportunity(fixture.ai, opportunity);
  assert.deepEqual(result, { analysis, embedding });
  assert.deepEqual(
    fixture.calls.map((call) => call.model),
    [ANALYSIS_MODEL, EMBEDDING_MODEL],
  );
  const input = fixture.calls[0].input as {
    response_format: { type: string; json_schema: { required: string[] } };
    temperature: number;
  };
  assert.equal(input.response_format.type, "json_schema");
  assert.ok(
    input.response_format.json_schema.required.includes("mentorshipAvailable"),
  );
  assert.equal(input.temperature, 0);
});
test("malformed, invented, and incomplete model outputs fail closed", async () => {
  for (const output of [
    "not JSON",
    { ...analysis, difficulty: 6 },
    { ...analysis, mentorshipAvailable: "yes" },
    { ...analysis, extra: "injected" },
    {},
  ]) {
    const fixture = modelFixture(output);
    await assert.rejects(
      analyzeOpportunity(fixture.ai, opportunity),
      AnalysisUnavailable,
    );
    assert.equal(fixture.calls.length, 1);
  }
});
test("invalid embeddings never enter persistence", async () => {
  for (const vector of [
    [],
    [1, 2],
    Array(384).fill(0),
    [NaN, ...embedding.slice(1)],
  ]) {
    await assert.rejects(
      analyzeOpportunity(modelFixture(analysis, vector).ai, opportunity),
      AnalysisUnavailable,
    );
  }
});
test("developer readiness embeddings exclude learning aspirations and interests", async () => {
  const fixture = modelFixture(analysis);
  await analyzeDeveloper(fixture.ai, {
    ...developer,
    wantsToLearn: ["aspiration-only"],
    interests: ["interest-only"],
  });
  assert.equal(fixture.calls[0].model, EMBEDDING_MODEL);
  const serialized = JSON.stringify(fixture.calls[0].input);
  assert.match(serialized, /Garden site/);
  assert.ok(!serialized.includes("aspiration-only"));
  assert.ok(!serialized.includes("interest-only"));
});
test("missing model binding returns a retryable failure", async () => {
  await assert.rejects(
    analyzeOpportunity(undefined, opportunity),
    AnalysisUnavailable,
  );
  await assert.rejects(
    analyzeDeveloper(undefined, developer),
    AnalysisUnavailable,
  );
});

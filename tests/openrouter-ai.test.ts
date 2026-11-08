import assert from "node:assert/strict";
import test from "node:test";
import { openRouterAI } from "../convex/ai.ts";
import { ANALYSIS_MODEL, EMBEDDING_MODEL } from "../backend/models.ts";
import { openRouterSchema } from "../backend/ai-schema.ts";

test("Convex owns OpenRouter requests and rejects invalid provider output", async (t) => {
  const names = ["OPENROUTER_API_KEY"];
  const previous = names.map((name) => process.env[name]);
  t.after(() =>
    names.forEach((name, i) => {
      if (previous[i] === undefined) delete process.env[name];
      else process.env[name] = previous[i];
    }),
  );
  delete process.env.OPENROUTER_API_KEY;
  assert.equal(openRouterAI(), undefined);
  process.env.OPENROUTER_API_KEY = "test-only-provider-token";
  let valid = true;
  const vector = Array.from({ length: 384 }, (_, i) => (i === 0 ? 1 : 0));
  t.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    assert.equal(url, "https://openrouter.ai/api/v1/embeddings");
    assert.equal(
      new Headers(init.headers).get("authorization"),
      "Bearer test-only-provider-token",
    );
    assert.equal(init.redirect, "error");
    const body = JSON.parse(String(init.body));
    assert.equal(body.model, EMBEDDING_MODEL);
    assert.equal(body.dimensions, 384);
    assert.deepEqual(body.input, ["fixture"]);
    assert.deepEqual(body.provider, {
      require_parameters: true,
      data_collection: "deny",
    });
    return Response.json(
      valid
        ? { data: [{ index: 0, embedding: vector }] }
        : {
            success: false,
            errors: [{ message: "private provider diagnostic" }],
          },
    );
  });
  const ai = openRouterAI()!;
  const input = {
    input: ["fixture"],
    dimensions: 384,
    encoding_format: "float",
  };
  assert.deepEqual(await ai.run(EMBEDDING_MODEL, input), { data: [vector] });
  valid = false;
  await assert.rejects(
    ai.run(EMBEDDING_MODEL, input),
    (error) =>
      error instanceof Error && error.message === "OpenRouter is unavailable",
  );
});

test("OpenRouter analysis wraps JSON schemas and rejects truncated completions", async (t) => {
  const previous = process.env.OPENROUTER_API_KEY;
  t.after(() => {
    if (previous === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = previous;
  });
  process.env.OPENROUTER_API_KEY = "test-only-provider-token";
  let finishReason = "stop";
  const schema = {
    type: "object",
    properties: {},
    additionalProperties: false,
  };
  t.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    assert.equal(url, "https://openrouter.ai/api/v1/chat/completions");
    const body = JSON.parse(String(init.body));
    assert.equal(body.model, ANALYSIS_MODEL);
    assert.equal(body.stream, false);
    assert.deepEqual(body.response_format.json_schema, {
      name: "analysis",
      strict: true,
      schema,
    });
    return Response.json({
      choices: [{ finish_reason: finishReason, message: { content: "{}" } }],
    });
  });
  const ai = openRouterAI()!;
  const input = {
    messages: [{ role: "user", content: "fixture" }],
    response_format: { type: "json_schema", json_schema: schema },
  };
  assert.deepEqual(await ai.run(ANALYSIS_MODEL, input), { response: "{}" });
  finishReason = "length";
  await assert.rejects(
    ai.run(ANALYSIS_MODEL, input),
    /OpenRouter is unavailable/,
  );
});

test("provider schema preserves field names while leaving refinements to Zod", () => {
  assert.deepEqual(
    openRouterSchema({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      properties: {
        pattern: { type: "string", maxLength: 20, pattern: "^[a-z]+$" },
        items: {
          type: "array",
          maxItems: 10,
          items: { type: "integer", minimum: 1, maximum: 5 },
        },
      },
      required: ["pattern", "items"],
      additionalProperties: false,
    }),
    {
      type: "object",
      properties: {
        pattern: { type: "string" },
        items: { type: "array", items: { type: "integer" } },
      },
      required: ["pattern", "items"],
      additionalProperties: false,
    },
  );
});

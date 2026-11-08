import assert from "node:assert/strict";
import test from "node:test";
import { workersAI } from "../convex/ai.ts";
import { EMBEDDING_MODEL } from "../backend/models.ts";

test("Convex owns explicitly enabled Workers AI REST calls and validates the provider envelope", async (t) => {
  const names = [
    "WORKERS_AI_ENABLED",
    "WORKERS_AI_ACCOUNT_ID",
    "WORKERS_AI_API_TOKEN",
  ];
  const previous = names.map((name) => process.env[name]);
  t.after(() =>
    names.forEach((name, i) => {
      if (previous[i] === undefined) delete process.env[name];
      else process.env[name] = previous[i];
    }),
  );
  process.env.WORKERS_AI_ENABLED = "false";
  assert.equal(workersAI(), undefined);
  process.env.WORKERS_AI_ENABLED = "true";
  process.env.WORKERS_AI_ACCOUNT_ID = "0".repeat(32);
  process.env.WORKERS_AI_API_TOKEN = "test-only-provider-token";
  let valid = true;
  t.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    assert.equal(
      url,
      `https://api.cloudflare.com/client/v4/accounts/${"0".repeat(32)}/ai/run/${EMBEDDING_MODEL}`,
    );
    assert.equal(
      new Headers(init.headers).get("authorization"),
      "Bearer test-only-provider-token",
    );
    assert.equal(init.redirect, "error");
    return Response.json(
      valid
        ? { success: true, result: { data: [[1, 2]] } }
        : {
            success: false,
            errors: [{ message: "private provider diagnostic" }],
          },
    );
  });
  const ai = workersAI()!;
  assert.deepEqual(await ai.run(EMBEDDING_MODEL, { text: ["fixture"] }), {
    data: [[1, 2]],
  });
  valid = false;
  await assert.rejects(
    ai.run(EMBEDDING_MODEL, {}),
    (error) =>
      error instanceof Error && error.message === "Workers AI is unavailable",
  );
});

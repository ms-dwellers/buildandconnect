import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "../app/api/health/route.ts";

test("health returns a minimal successful liveness response", async () => {
  const response = GET();

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: "ok",
    service: "buildandconnect",
  });
});

test("health is JSON and must not be cached", () => {
  const response = GET();

  assert.match(response.headers.get("Content-Type") ?? "", /application\/json/);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});

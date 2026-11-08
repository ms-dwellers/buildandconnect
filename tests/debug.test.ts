import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRequest,
  redact,
  requests,
  sampleOpportunity,
  sampleProfile,
} from "../app/debug/requests.ts";
import { developerSchema, opportunitySchema } from "../backend/schemas.ts";

const preset = (id: string) => requests.find((request) => request.id === id)!;

test("QA samples follow the actual backend contracts", () => {
  assert.ok(developerSchema.safeParse(sampleProfile).success);
  assert.ok(opportunitySchema.safeParse(sampleOpportunity).success);
  assert.equal(
    new Set(requests.map((request) => request.id)).size,
    requests.length,
  );
  for (const request of requests) assert.ok(request.path.startsWith("/api/"));
});
test("requests use explicit context IDs and same-origin catalog paths", () => {
  assert.deepEqual(
    buildRequest(preset("matches"), "opportunity-123", "", "limit=10", ""),
    {
      path: "/api/opportunities/opportunity-123/matches?limit=10",
      method: "GET",
      body: undefined,
    },
  );
  for (const id of [
    "",
    "../auth",
    "//example.test",
    "foo?limit=100",
    "#fragment",
  ]) {
    assert.throws(
      () => buildRequest(preset("matches"), id, "", "", ""),
      /opportunity ID/,
    );
  }
});
test("query fields are bounded by the selected endpoint contract", () => {
  assert.match(
    buildRequest(
      preset("opportunities"),
      "",
      "",
      "city=New York&kind=paid&limit=5",
      "",
    ).path,
    /city=New\+York/,
  );
  assert.throws(
    () => buildRequest(preset("matches"), "job", "", "after=other", ""),
    /Supported query fields: limit/,
  );
  assert.throws(
    () => buildRequest(preset("developers"), "", "", "token=credential", ""),
    /Supported query fields/,
  );
});
test("requester interest resolves its placeholder but still permits invalid JSON objects for QA", () => {
  const request = preset("interest-requester");
  assert.equal(
    JSON.parse(
      buildRequest(request, "job", "dev", "", JSON.stringify(request.body))
        .body!,
    ).developerId,
    "dev",
  );
  assert.throws(
    () => buildRequest(request, "job", "", "", JSON.stringify(request.body)),
    /developer ID/,
  );
  assert.throws(
    () => buildRequest(preset("profile-save"), "", "", "", "not json"),
    /valid JSON/,
  );
  assert.equal(
    buildRequest(preset("profile-save"), "", "", "", "{}").body,
    "{}",
  );
});
test("response history recursively redacts credentials and echoed passwords", () => {
  const secret = "runtime-test-password";
  const result = redact(
    {
      token: secret,
      user: { name: "QA Developer", password: secret },
      session: { token: secret, expiresAt: "tomorrow" },
      nested: [
        {
          accessToken: secret,
          refresh_token: secret,
          BETTER_AUTH_SECRET: secret,
          Cookie: secret,
        },
      ],
      message: `Rejected ${secret}`,
    },
    [secret],
  );
  const serialized = JSON.stringify(result);
  assert.ok(!serialized.includes(secret));
  assert.match(serialized, /QA Developer/);
  assert.match(serialized, /tomorrow/);
  assert.match(serialized, /\[redacted\]/);
});

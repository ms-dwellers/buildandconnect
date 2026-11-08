import assert from "node:assert/strict";
import test from "node:test";
import {
  createAuthenticatedClient,
  createOptionalClient,
} from "../backend/auth.ts";

const env = {
  VITE_CONVEX_URL: "https://test.convex.cloud",
  VITE_CONVEX_SITE_URL: "https://test.convex.site",
  SITE_URL: "https://app.example.test",
  CONVEX_BRIDGE_SECRET: "test-bridge-only-not-a-secret",
};

function sessionRequest() {
  const part = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const cached = `${part({ alg: "HS256" })}.${part({ exp: Math.floor(Date.now() / 1000) + 900, sub: "revoked-session-user" })}.test-signature`;
  return new Request(`${env.SITE_URL}/api/project-drafts/example`, {
    method: "PUT",
    headers: {
      Cookie: `__Secure-better-auth.session_token=current-session; __Secure-better-auth.convex_jwt=${cached}`,
      Origin: env.SITE_URL,
      "Content-Type": "application/json",
      "x-buildandconnect-bridge": "untrusted-client-value",
    },
    body: "{}",
  });
}

test("a cached JWT cannot bypass verification of the current sign-in session", async (t) => {
  const calls: { url: string; headers: Headers; method: string }[] = [];
  t.mock.method(
    globalThis,
    "fetch",
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      calls.push({
        url: request.url,
        headers: request.headers,
        method: request.method,
      });
      return Response.json({ token: "fresh-session-token" });
    },
  );
  await createAuthenticatedClient(env, sessionRequest());
  assert.equal(
    calls.length,
    1,
    "must exchange the live session, not trust a cached JWT",
  );
  assert.equal(
    calls[0].url,
    `${env.VITE_CONVEX_SITE_URL}/api/auth/convex/token`,
  );
  assert.equal(calls[0].method, "GET");
  assert.equal(
    calls[0].headers.get("x-buildandconnect-bridge"),
    env.CONVEX_BRIDGE_SECRET,
  );
  assert.equal(
    calls[0].headers.get("x-better-auth-forwarded-host"),
    "app.example.test",
  );
});

for (const [upstreamStatus, expectedStatus] of [
  [401, 401],
  [429, 429],
  [500, 503],
  [403, 503],
] as const) {
  test(`token service HTTP ${upstreamStatus} is reported as ${expectedStatus}, without exposing provider details`, async (t) => {
    t.mock.method(globalThis, "fetch", async () =>
      Response.json(
        { message: "private-provider-details" },
        { status: upstreamStatus },
      ),
    );
    await assert.rejects(
      createAuthenticatedClient(env, sessionRequest()),
      (error: unknown) => {
        assert.ok(error instanceof Error && "status" in error);
        assert.equal(error.status, expectedStatus);
        assert.doesNotMatch(error.message, /private-provider-details/);
        return true;
      },
    );
  });
}

test("malformed token responses fail as unavailable, not signed out", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({}));
  await assert.rejects(
    createAuthenticatedClient(env, sessionRequest()),
    (error: unknown) => {
      assert.ok(error instanceof Error && "status" in error);
      assert.equal(error.status, 503);
      return true;
    },
  );
});

test("network failures are unavailable, not signed out", async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    throw new Error("private-network-details");
  });
  await assert.rejects(
    createAuthenticatedClient(env, sessionRequest()),
    (error: unknown) => {
      assert.ok(error instanceof Error && "status" in error);
      assert.equal(error.status, 503);
      assert.doesNotMatch(error.message, /private-network-details/);
      return true;
    },
  );
});

test("public reads allow expired sessions but not authentication outages", async (t) => {
  const fetch = t.mock.method(
    globalThis,
    "fetch",
    async () => new Response(null, { status: 401 }),
  );
  await createOptionalClient(env, sessionRequest());
  fetch.mock.mockImplementation(
    async () => new Response(null, { status: 503 }),
  );
  await assert.rejects(
    createOptionalClient(env, sessionRequest()),
    (error: unknown) => {
      assert.ok(error instanceof Error && "status" in error);
      assert.equal(error.status, 503);
      return true;
    },
  );
});

test("anonymous requests do not call the token service", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => {
    throw new Error("Should not fetch");
  });
  const request = new Request(`${env.SITE_URL}/api/me`);
  await createOptionalClient(env, request);
  await assert.rejects(
    createAuthenticatedClient(env, request),
    (error: unknown) => {
      assert.ok(error instanceof Error && "status" in error);
      assert.equal(error.status, 401);
      return true;
    },
  );
  assert.equal(fetch.mock.callCount(), 0);
});

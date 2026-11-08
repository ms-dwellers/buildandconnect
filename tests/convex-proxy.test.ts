import assert from "node:assert/strict";
import test from "node:test";
import { forwardToConvex } from "../lib/convex-proxy.ts";

const config = {
  VITE_CONVEX_SITE_URL: "https://deployment.convex.site",
  SITE_URL: "https://app.example.test",
};
test("web forwarding preserves sessions, cookies and headers without a bridge or application logic", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: URL, init: RequestInit) => {
    assert.equal(
      url.href,
      "https://deployment.convex.site/api/auth/sign-in/email?test=1",
    );
    const headers = new Headers(init.headers);
    assert.equal(headers.get("cookie"), "session=fixture");
    assert.equal(headers.get("authorization"), "Bearer fixture");
    assert.equal(headers.get("x-forwarded-for"), null);
    assert.equal(headers.get("cf-connecting-ip"), null);
    assert.equal(headers.get("x-buildandconnect-bridge"), null);
    assert.equal(
      headers.get("x-better-auth-forwarded-host"),
      "app.example.test",
    );
    assert.equal(new TextDecoder().decode(init.body as ArrayBuffer), "{}");
    assert.equal(init.redirect, "manual");
    const result = new Response("{}", {
      status: 200,
      headers: { "set-auth-token": "signed-fixture" },
    });
    result.headers.append("Set-Cookie", "session=fixture; HttpOnly; Secure");
    result.headers.append("Set-Cookie", "other=fixture; HttpOnly; Secure");
    return result;
  });
  const response = await forwardToConvex(
    new Request("https://app.example.test/api/auth/sign-in/email?test=1", {
      method: "POST",
      body: "{}",
      headers: {
        Cookie: "session=fixture",
        Authorization: "Bearer fixture",
        "x-forwarded-for": "attacker",
        "cf-connecting-ip": "attacker",
        "x-buildandconnect-bridge": "attacker",
        "x-better-auth-forwarded-host": "attacker",
      },
    }),
    config,
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.getSetCookie().length, 2);
  assert.equal(response.headers.get("set-auth-token"), "signed-fixture");
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("forwarder bounds streaming bodies and reports unavailable configuration/transport", async (t) => {
  assert.equal(
    (await forwardToConvex(new Request("https://app.example.test/api/me"), {}))
      .status,
    503,
  );
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    throw new Error("offline");
  });
  assert.equal(
    (
      await forwardToConvex(
        new Request("https://app.example.test/api/me", {
          method: "POST",
          body: "x".repeat(32769),
        }),
        config,
      )
    ).status,
    413,
  );
  assert.equal(calls, 0);
  assert.equal(
    (
      await forwardToConvex(
        new Request("https://app.example.test/api/me"),
        config,
      )
    ).status,
    503,
  );
});

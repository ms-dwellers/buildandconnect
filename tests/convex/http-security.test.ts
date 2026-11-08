import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { setup, job } from "./harness";

beforeEach(() => {
  vi.stubEnv("SITE_URL", "https://app.example.test");
  vi.stubEnv("CONVEX_SITE_URL", "https://test.convex.site");
  vi.stubEnv(
    "BETTER_AUTH_SECRET",
    "http-security-test-only-secret-at-least-32-characters",
  );
});
afterEach(() => vi.unstubAllEnvs());

test("HTTP writes reject forged fields, oversized bodies, cookie CSRF, and unauthorized inference", async () => {
  const runtime = setup();
  let nextIP = 1;
  const headers = {
    "Content-Type": "application/json",
    Origin: "https://test.convex.site",
  };
  async function company() {
    const result = await runtime.fetch("/api/auth/sign-up/email", {
      method: "POST",
      headers: { ...headers, "x-forwarded-for": `192.0.2.${nextIP++}` },
      body: JSON.stringify({
        name: "Company",
        email: `${crypto.randomUUID()}@example.test`,
        password: "http-security-test-password-1234",
      }),
    });
    expect(result.status).toBe(200);
    const auth = {
      ...headers,
      Authorization: `Bearer ${result.headers.get("set-auth-token")}`,
    };
    expect(
      (
        await runtime.fetch("/api/me/role", {
          method: "PUT",
          headers: auth,
          body: JSON.stringify({ role: "requester" }),
        })
      ).status,
    ).toBe(200);
    return {
      auth,
      cookie: result.headers
        .getSetCookie()
        .map((cookie) => cookie.split(";", 1)[0])
        .join("; "),
    };
  }
  const owner = await company();
  const rival = await company();
  const staleJwt = `${btoa(JSON.stringify({ alg: "HS256" }))}.${btoa(JSON.stringify({ sub: "revoked-session", exp: Math.floor(Date.now() / 1000) + 900 }))}.old-signature`;
  const currentCookies = owner.cookie
    .split("; ")
    .filter((cookie) => !cookie.split("=", 1)[0].endsWith("convex_jwt"))
    .join("; ");
  const recovered = await runtime.fetch("/api/project-drafts", {
    method: "POST",
    headers: {
      ...headers,
      Cookie: `${currentCookies}; better-auth.convex_jwt=${staleJwt}`,
    },
    body: JSON.stringify({
      id: crypto.randomUUID(),
      content: {
        title: "Draft with a stale cached JWT",
        description: "",
        city: "",
        kind: "",
        remote: false,
        collaboration: "flexible",
        essentialTechnologies: "",
        interests: "",
        minimumWeeklyHours: "",
        compensation: "",
        commitment: "",
        place: "",
        pin: null,
      },
    }),
  });
  expect(recovered.status).toBe(201);
  const posted = await runtime.fetch("/api/opportunities", {
    method: "POST",
    headers: owner.auth,
    body: JSON.stringify(job),
  });
  const { id } = (await posted.json()) as { id: string };
  expect(posted.status).toBe(201);
  expect(
    (
      await runtime.fetch(`/api/opportunities/${id}`, {
        method: "PUT",
        headers: rival.auth,
        body: JSON.stringify({ ...job, description: "AI_UNAVAILABLE" }),
      })
    ).status,
  ).toBe(403);
  expect(
    (
      await runtime.fetch("/api/me/role", {
        method: "PUT",
        headers: owner.auth,
        body: JSON.stringify({
          role: "requester",
          sessionId: "forged-session",
        }),
      })
    ).status,
  ).toBe(400);
  expect(
    (
      await runtime.fetch("/api/opportunities", {
        method: "POST",
        headers: owner.auth,
        body: "x".repeat(32769),
      })
    ).status,
  ).toBe(413);
  expect(
    (
      await runtime.fetch("/api/me/role", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Cookie: owner.cookie },
        body: JSON.stringify({ role: "requester" }),
      })
    ).status,
  ).toBe(403);
});

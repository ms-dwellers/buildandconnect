import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { setup } from "./harness";

beforeEach(() => {
  vi.stubEnv(
    "BETTER_AUTH_SECRET",
    "native-auth-test-only-secret-at-least-32-characters",
  );
  vi.stubEnv("SITE_URL", "https://app.example.test");
  vi.stubEnv("CONVEX_SITE_URL", "https://test.convex.site");
});
afterEach(() => vi.unstubAllEnvs());

test("direct Convex native sign-in issues signed sessions and sign-out revokes data access", async () => {
  const t = setup();
  const headers = {
    "Content-Type": "application/json",
    Origin: "https://test.convex.site",
  };
  const result = await t.fetch("/api/auth/sign-up/email", {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: "Native developer",
      email: "native@example.test",
      password: "native-test-password-1234",
    }),
  });
  expect(result.status).toBe(200);
  const token = result.headers.get("set-auth-token");
  expect(token).toBeTruthy();
  const authenticated = { ...headers, Authorization: `Bearer ${token}` };
  expect((await t.fetch("/api/me", { headers: authenticated })).status).toBe(
    200,
  );
  expect(
    (
      await t.fetch("/api/me", {
        headers: { ...headers, Authorization: "Bearer unsigned-invalid-token" },
      })
    ).status,
  ).toBe(401);
  expect(
    (
      await t.fetch("/api/auth/sign-out", {
        method: "POST",
        headers: authenticated,
        body: "{}",
      })
    ).status,
  ).toBe(200);
  expect((await t.fetch("/api/me", { headers: authenticated })).status).toBe(
    401,
  );
});

test("direct authentication and application writes reject untrusted origins without a bridge", async () => {
  const t = setup();
  const headers = {
    "Content-Type": "application/json",
    Origin: "https://attacker.test",
  };
  expect(
    (
      await t.fetch("/api/auth/sign-up/email", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: "Attacker",
          email: "attacker@example.test",
          password: "native-test-password-1234",
        }),
      })
    ).status,
  ).toBe(403);
  expect(
    (
      await t.fetch("/api/me/role", {
        method: "PUT",
        headers,
        body: JSON.stringify({ role: "company" }),
      })
    ).status,
  ).toBe(403);
});

import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { secret, setup } from "./harness";

beforeEach(() => {
  vi.stubEnv("CONVEX_BRIDGE_SECRET", secret);
  vi.stubEnv(
    "BETTER_AUTH_SECRET",
    "native-auth-test-only-secret-at-least-32-characters",
  );
  vi.stubEnv("SITE_URL", "https://app.example.test");
  vi.stubEnv("CONVEX_SITE_URL", "https://test.convex.site");
});
afterEach(() => vi.unstubAllEnvs());

test("native sign-in issues a signed bearer session and sign-out revokes it", async () => {
  const t = setup();
  const headers = {
    "Content-Type": "application/json",
    "x-buildandconnect-bridge": secret,
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
  expect(
    await (
      await t.fetch("/api/auth/get-session", {
        headers: { ...headers, Authorization: "Bearer unsigned-invalid-token" },
      })
    ).json(),
  ).toBeNull();
  const session = await t.fetch("/api/auth/get-session", {
    headers: authenticated,
  });
  expect(await session.json()).toMatchObject({
    user: { name: "Native developer" },
  });
  expect(
    (
      await t.fetch("/api/auth/sign-out", {
        method: "POST",
        headers: authenticated,
        body: "{}",
      })
    ).status,
  ).toBe(200);
  expect(
    await (
      await t.fetch("/api/auth/get-session", { headers: authenticated })
    ).json(),
  ).toBeNull();
});

test("native authentication cannot bypass the server bridge", async () => {
  const t = setup();
  const response = await t.fetch("/api/auth/sign-in/email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "native@example.test",
      password: "invalid-password",
    }),
  });
  expect(response.status).toBe(403);
});

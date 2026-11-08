import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { setup } from "./harness";

beforeEach(() => {
  vi.stubEnv(
    "BETTER_AUTH_SECRET",
    "auth-providers-test-only-secret-at-least-32-chars",
  );
  vi.stubEnv("SITE_URL", "https://app.example.test");
  vi.stubEnv("CONVEX_SITE_URL", "https://test.convex.site");
});
afterEach(() => vi.unstubAllEnvs());

test("provider availability is public and mirrors deployment credentials", async () => {
  const t = setup();
  const none = await t.fetch("/api/auth-providers");
  expect(none.status).toBe(200);
  expect(none.headers.get("Cache-Control")).toBe("no-store");
  await expect(none.json()).resolves.toEqual({ google: false, github: false });

  // Half a credential keeps a provider hidden; both halves enable it.
  vi.stubEnv("GOOGLE_CLIENT_ID", "google-id");
  vi.stubEnv("GITHUB_CLIENT_ID", "github-id");
  vi.stubEnv("GITHUB_CLIENT_SECRET", "github-secret");
  await expect((await t.fetch("/api/auth-providers")).json()).resolves.toEqual({
    google: false,
    github: true,
  });
});

test("a configured provider starts sign-in through the same-origin callback", async () => {
  const t = setup();
  const headers = {
    "Content-Type": "application/json",
    Origin: "https://app.example.test",
  };
  const start = (provider: string) =>
    t.fetch("/api/auth/sign-in/social", {
      method: "POST",
      headers,
      body: JSON.stringify({ provider, callbackURL: "/dashboard" }),
    });
  expect((await start("github")).status).not.toBe(200);

  vi.stubEnv("GITHUB_CLIENT_ID", "github-id");
  vi.stubEnv("GITHUB_CLIENT_SECRET", "github-secret");
  const result = await start("github");
  expect(result.status).toBe(200);
  const { url } = (await result.json()) as { url: string };
  const authorize = new URL(url);
  expect(authorize.origin).toBe("https://github.com");
  expect(authorize.searchParams.get("client_id")).toBe("github-id");
  expect(authorize.searchParams.get("redirect_uri")).toBe(
    "https://app.example.test/api/auth/callback/github",
  );
  expect(url).not.toContain("github-secret");
  expect((await start("google")).status).not.toBe(200);
});

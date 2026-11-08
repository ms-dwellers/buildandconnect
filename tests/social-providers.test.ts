import assert from "node:assert/strict";
import test from "node:test";
import {
  PROVIDER_IDS,
  PROVIDER_VARIABLES,
  configuredProviders,
  socialProviders,
} from "../convex/socialProviders.ts";

test("social providers appear only when both credentials are present", () => {
  assert.deepEqual(socialProviders({}), {});
  assert.deepEqual(configuredProviders({}), { google: false, github: false });
  const env = {
    GOOGLE_CLIENT_ID: "google-id",
    GOOGLE_CLIENT_SECRET: "google-secret",
    GITHUB_CLIENT_ID: "github-id-without-a-secret",
  };
  const providers = socialProviders(env);
  assert.deepEqual(Object.keys(providers), ["google"]);
  assert.deepEqual(providers.google, {
    clientId: "google-id",
    clientSecret: "google-secret",
    prompt: "select_account",
  });
  assert.deepEqual(configuredProviders(env), { google: true, github: false });
});

test("blank credentials count as missing", () => {
  const env = { GITHUB_CLIENT_ID: "  ", GITHUB_CLIENT_SECRET: "secret" };
  assert.deepEqual(socialProviders(env), {});
  assert.equal(configuredProviders(env).github, false);
});

test("every provider reads exactly two deployment variables", () => {
  for (const id of PROVIDER_IDS) {
    const names = PROVIDER_VARIABLES[id];
    assert.equal(names.length, 2);
    for (const name of names) assert.match(name, /^[A-Z_]+$/);
    assert.match(names[0], /_CLIENT_ID$/);
    assert.match(names[1], /_CLIENT_SECRET$/);
  }
});

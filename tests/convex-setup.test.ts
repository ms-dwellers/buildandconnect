import assert from "node:assert/strict";
import test from "node:test";
import {
  PROVIDER_VARIABLES,
  mergeEnvironment,
  providerSummary,
} from "../scripts/configure-convex.mjs";

test("Convex setup preserves unrelated settings and replaces only owned keys", () => {
  const result = mergeEnvironment(
    "# local settings\nNEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=example\nSITE_URL=old\nCONVEX_BRIDGE_SECRET=old\n",
    { SITE_URL: "http://127.0.0.1:5173", CONVEX_BRIDGE_SECRET: "fixture" },
  );
  assert.match(result, /NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=example/);
  assert.match(result, /# local settings/);
  assert.equal(result.match(/SITE_URL=/g)?.length, 1);
  assert.equal(result.match(/CONVEX_BRIDGE_SECRET=/g)?.length, 1);
  assert.match(result, /SITE_URL=http:\/\/127\.0\.0\.1:5173/);
});

test("setup reports social providers only when both halves of a credential exist", () => {
  assert.match(providerSummary(new Set()), /not configured/);
  assert.match(
    providerSummary(new Set(["GOOGLE_CLIENT_ID"])),
    /not configured/,
  );
  assert.equal(
    providerSummary(new Set(["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"])),
    "Social sign-in is configured for Google.",
  );
  assert.equal(
    providerSummary(new Set(PROVIDER_VARIABLES)),
    "Social sign-in is configured for Google and GitHub.",
  );
  for (const name of PROVIDER_VARIABLES) assert.match(name, /^[A-Z_]+$/);
});

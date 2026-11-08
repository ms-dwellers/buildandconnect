import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  developerSchema,
  opportunitySchema,
  requestSchema,
} from "../backend/schemas.ts";
import {
  projectDraftContentSchema,
  opportunityFromDraft,
} from "../backend/project-drafts.ts";
import { isInCalgary } from "../lib/calgary-area.ts";
import { careerTargetInputSchema } from "../backend/career/schemas.ts";
import {
  demoAccounts,
  demoCareerTarget,
  demoProjects,
  demoRequests,
  demoInterests,
  DEMO_NOTICE,
} from "../scripts/demo-data.ts";
import {
  demoDraft,
  demoDraftId,
  demoEnvironment,
} from "../scripts/seed-demo.mjs";

test("seed refuses production, deploy keys, public hosts and credential-bearing origins", () => {
  const safe = {
    CONVEX_DEPLOYMENT: "dev:demo",
    SITE_URL: "https://private.example.ts.net",
  };
  assert.equal(demoEnvironment(safe).origin, safe.SITE_URL);
  for (const env of [
    { ...safe, CONVEX_DEPLOYMENT: "prod:demo" },
    { ...safe, CONVEX_DEPLOY_KEY: "not-a-real-key" },
    { ...safe, SITE_URL: "https://example.com" },
    { ...safe, SITE_URL: "https://name:password@private.example.ts.net" },
    { ...safe, SITE_URL: "https://private.example.ts.net/path" },
  ])
    assert.throws(() => demoEnvironment(env));
});

test("fictional seed records satisfy live schemas, bounds and two-role contracts", () => {
  for (const account of demoAccounts) {
    assert.ok(["developer", "requester"].includes(account.role));
    if ("profile" in account && account.profile) {
      developerSchema.parse(account.profile);
      assert.ok(account.profile.bio.startsWith(DEMO_NOTICE));
    }
  }
  for (const project of demoProjects) {
    opportunitySchema.parse(project.details);
    assert.ok(project.details.description.startsWith(DEMO_NOTICE));
    assert.ok(
      isInCalgary({
        latitude: project.details.latitude!,
        longitude: project.details.longitude!,
      }),
    );
    projectDraftContentSchema.parse(demoDraft(project.details));
    assert.deepEqual(
      JSON.parse(
        JSON.stringify(opportunityFromDraft(demoDraft(project.details))),
      ),
      project.details,
    );
  }
  for (const request of demoRequests) {
    requestSchema.parse(request.details);
    assert.ok(request.details.description.startsWith(DEMO_NOTICE));
    assert.ok(isInCalgary(request.details));
  }
  assert.match(demoCareerTarget.sourceText, /Fictional/);
  careerTargetInputSchema.parse(demoCareerTarget);
});

test("draft IDs are deterministic UUIDs and separate project keys", () => {
  assert.equal(demoDraftId("food-bank"), demoDraftId("food-bank"));
  assert.notEqual(demoDraftId("food-bank"), demoDraftId("garden"));
  assert.match(
    demoDraftId("food-bank"),
    /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
});

test("demo interactions refer only to the intended fictional account roles", () => {
  const accounts = new Map(
    demoAccounts.map((account) => [account.key, account]),
  );
  const projects = new Map(
    demoProjects.map((project) => [project.key, project]),
  );
  assert.equal(accounts.size, demoAccounts.length);
  assert.equal(projects.size, demoProjects.length);
  for (const item of [...demoProjects, ...demoRequests]) {
    assert.equal(accounts.get(item.owner)?.role, "requester");
  }
  for (const interest of demoInterests) {
    assert.ok(projects.has(interest.project));
    assert.equal(accounts.get(interest.developer)?.role, "developer");
  }
});

test("inference credentials live in Convex, not in the Worker or Vite config", () => {
  const binding = readFileSync(
    new URL("../cloudflare.config.ts", import.meta.url),
    "utf8",
  );
  const vite = readFileSync(
    new URL("../vite.config.ts", import.meta.url),
    "utf8",
  );
  const convexAI = readFileSync(
    new URL("../convex/ai.ts", import.meta.url),
    "utf8",
  );
  const guide = readFileSync(
    new URL("../docs/hackathon-demo.md", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(binding, /bindings\.ai\(|WORKERS_AI/);
  assert.doesNotMatch(vite, /WORKERS_AI_REMOTE/);
  // Analysis and embeddings run through Fireworks from the Convex environment.
  assert.match(convexAI, /process\.env\.FIREWORKS_API_KEY/);
  assert.doesNotMatch(convexAI, /WORKERS_AI/);
  assert.doesNotMatch(guide, /WORKERS_AI_REMOTE/);
  assert.match(guide, /Fireworks/);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("onboarding and public role types expose only developers and requesters", () => {
  // One tuple owns the roles; the type, the zod enum and the Convex validator
  // all follow it.
  const schemas = readFileSync(
    new URL("../backend/schemas.ts", import.meta.url),
    "utf8",
  );
  assert.match(
    schemas,
    /export const ROLES = \["developer", "requester"\] as const;/,
  );
  assert.match(schemas, /export type Role = \(typeof ROLES\)\[number\];/);
  assert.match(
    readFileSync(new URL("../lib/api.ts", import.meta.url), "utf8"),
    /export type \{ Role \} from "\.\.\/backend\/schemas\.ts";/,
  );
  assert.match(
    readFileSync(new URL("../convex/api.ts", import.meta.url), "utf8"),
    /z\.enum\(ROLES\)/,
  );
  assert.match(
    readFileSync(new URL("../convex/schema.ts", import.meta.url), "utf8"),
    /v\.union\(v\.literal\("developer"\), v\.literal\("requester"\)\)/,
  );
  const choices = readFileSync(
    new URL("../components/app/role-chooser.tsx", import.meta.url),
    "utf8",
  );
  assert.match(choices, /role: "developer"/);
  assert.match(choices, /role: "requester"/);
  assert.doesNotMatch(choices, /[Cc]ompany|[Rr]ecruiter/);
  const studio = readFileSync(
    new URL("../app/voice/voice-studio.tsx", import.meta.url),
    "utf8",
  );
  assert.match(studio, /roles=\{\["requester"\]\}/);
});

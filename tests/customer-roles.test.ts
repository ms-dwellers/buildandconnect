import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("onboarding and public role types expose only developers and requesters", () => {
  for (const path of ["../lib/api.ts", "../backend/schemas.ts"]) {
    const source = readFileSync(new URL(path, import.meta.url), "utf8");
    assert.match(source, /export type Role = "developer" \| "requester"/);
  }
  const choices = readFileSync(
    new URL("../app/role/page.tsx", import.meta.url),
    "utf8",
  );
  assert.match(choices, /role: "developer"/);
  assert.match(choices, /role: "requester"/);
  assert.doesNotMatch(choices, /[Cc]ompany|[Rr]ecruiter/);
  const studio = readFileSync(
    new URL("../app/wip-voice-ai/voice-studio.tsx", import.meta.url),
    "utf8",
  );
  assert.match(studio, /roles=\{\["requester"\]\}/);
});

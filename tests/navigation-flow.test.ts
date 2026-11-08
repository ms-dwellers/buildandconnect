import assert from "node:assert/strict";
import test from "node:test";
import {
  afterAuthentication,
  afterRoleSelection,
  safeNext,
  withNext,
} from "../lib/navigation.ts";
import {
  prioritizeInterests,
  prioritizeOpportunities,
  prioritizeRequests,
} from "../lib/dashboard.ts";
import type {
  Interest,
  OpportunityRecord,
  RequestRecord,
} from "../lib/types.ts";

test("safe destinations preserve query and fragment but reject external redirects and auth loops", () => {
  const target = "/map?focus=request-1#details";
  assert.equal(safeNext(target), target);
  assert.equal(safeNext([target, "https://evil.test"]), target);
  for (const invalid of [
    "https://evil.test",
    "//evil.test",
    "/.//evil.test",
    "/%2e//evil.test",
    "/a/../%2fevil.test",
    "/\\evil.test",
    "/%5cevil.test",
    "/%2fevil.test",
    "/\nevil.test",
    "/map%0d%0aLocation:evil",
    "/sign-in?next=/career",
    "/role",
    "/onboarding",
    " ",
    "/" + "a".repeat(2000),
  ])
    assert.equal(safeNext(invalid), null, invalid);
});

test("sign-in, signup, role selection and onboarding keep one intended destination", () => {
  const target = "/requests/r?source=map#scope";
  const login = new URL(withNext("/sign-in", target), "https://local.test");
  const signup = new URL(
    withNext("/sign-up", login.searchParams.get("next")),
    login,
  );
  const role = new URL(
    afterAuthentication(null, signup.searchParams.get("next")),
    login,
  );
  const onboarding = new URL(
    afterRoleSelection("developer", role.searchParams.get("next")),
    login,
  );
  assert.equal(onboarding.pathname, "/onboarding");
  assert.equal(onboarding.searchParams.get("next"), target);
  assert.equal(
    afterAuthentication("developer", target),
    withNext("/onboarding", target),
  );
  assert.equal(afterRoleSelection("requester", null), "/projects/new");
  assert.equal(
    afterRoleSelection("developer", null),
    "/onboarding?next=%2Fcareer",
  );
  assert.equal(afterAuthentication("requester", "//evil.test"), "/dashboard");
});

test("dashboard priorities are viewer-specific and never mutate loaded records", () => {
  const waiting = {
    id: "waiting",
    requesterInterested: false,
    developerInterested: true,
    connected: false,
  } as Interest;
  const incoming = {
    id: "incoming",
    requesterInterested: true,
    developerInterested: false,
    connected: false,
  } as Interest;
  const connected = {
    id: "connected",
    requesterInterested: true,
    developerInterested: true,
    connected: true,
  } as Interest;
  const source = [waiting, connected, incoming];
  assert.deepEqual(
    prioritizeInterests(source, "developer").map((item) => item.id),
    ["incoming", "connected", "waiting"],
  );
  assert.deepEqual(
    prioritizeInterests(source, "requester").map((item) => item.id),
    ["waiting", "connected", "incoming"],
  );
  assert.deepEqual(source, [waiting, connected, incoming]);
  assert.deepEqual(
    prioritizeRequests([
      { status: "closed" },
      { status: "open" },
      { status: "claimed" },
    ] as RequestRecord[]).map((item) => item.status),
    ["claimed", "open", "closed"],
  );
  assert.deepEqual(
    prioritizeOpportunities([
      { status: "closed" },
      { status: "open" },
    ] as OpportunityRecord[]).map((item) => item.status),
    ["open", "closed"],
  );
});

import assert from "node:assert/strict";
import test from "node:test";
import { interestState, prioritizeInterests } from "../lib/dashboard.ts";
import type { Interest } from "../lib/types.ts";

function interest(
  requesterInterested: boolean,
  developerInterested: boolean,
): Interest {
  return {
    id: `${requesterInterested}-${developerInterested}`,
    opportunityId: "project",
    developerId: "developer",
    title: "Community project",
    developerName: "Developer",
    requesterName: "Requester",
    requesterInterested,
    developerInterested,
    connected: requesterInterested && developerInterested,
  };
}

test("dashboard status distinguishes incoming, sent, mutual and withdrawn interest for each role", () => {
  assert.equal(
    interestState(interest(true, false), "developer"),
    "needs-response",
  );
  assert.equal(interestState(interest(true, false), "requester"), "waiting");
  assert.equal(
    interestState(interest(false, true), "requester"),
    "needs-response",
  );
  assert.equal(interestState(interest(false, true), "developer"), "waiting");
  for (const role of ["developer", "requester"] as const) {
    assert.equal(interestState(interest(true, true), role), "connected");
    assert.equal(interestState(interest(false, false), role), "withdrawn");
  }
});

test("withdrawn activity never displaces a response or gets labeled waiting", () => {
  const incoming = interest(true, false);
  const sent = interest(false, true);
  const connected = interest(true, true);
  const withdrawn = interest(false, false);
  const source = [withdrawn, sent, connected, incoming];
  assert.deepEqual(prioritizeInterests(source, "developer"), [
    incoming,
    connected,
    sent,
    withdrawn,
  ]);
  assert.deepEqual(prioritizeInterests(source, "requester"), [
    sent,
    connected,
    incoming,
    withdrawn,
  ]);
  assert.deepEqual(source, [withdrawn, sent, connected, incoming]);
});

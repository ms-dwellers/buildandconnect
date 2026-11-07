import assert from "node:assert/strict";
import test from "node:test";
import {
  approximate,
  opportunityListing,
  requestListing,
} from "../backend/listings.ts";
import { opportunitySchema } from "../backend/schemas.ts";
import { analysis, opportunity } from "./fixtures/matching.ts";

const {
  id: _id,
  ownerId: _owner,
  analysis: _analysis,
  embedding: _embedding,
  status: _status,
  ...details
} = opportunity;
const pinned = {
  ...details,
  city: "Calgary",
  place: "Kensington",
  latitude: 51.0525,
  longitude: -114.0865,
};
const job = (
  overrides: Partial<typeof pinned> = {},
  status = "open" as const,
) => ({
  id: "job",
  ownerId: "company",
  ownerName: "Garden Co",
  details: { ...pinned, ...overrides },
  analysis,
  status,
});
const request = (
  status: "open" | "claimed" | "closed" = "open",
  claimedBy: string | null = null,
) => ({
  id: "request",
  ownerId: "neighbour",
  ownerName: "Pat Neighbour",
  details: {
    title: "Garden club website",
    description: "A simple website for our neighbourhood garden club.",
    place: "12 Garden Lane NW",
    latitude: 51.061234,
    longitude: -114.071234,
  },
  analysis,
  status,
  claimedBy,
});

test("approximate locations round to about one kilometre", () => {
  assert.equal(approximate(51.061234), 51.06);
  assert.equal(approximate(-114.0761), -114.08);
  assert.ok(Math.abs(approximate(51.0649) - 51.0649) < 0.006);
});

test("opportunities appear only when open, pinned, and inside Calgary", () => {
  const listing = opportunityListing(job(), { id: "company", role: "company" });
  assert.deepEqual(
    {
      source: listing?.source,
      organization: listing?.organization,
      neighbourhood: listing?.neighbourhood,
      precise: listing?.precise,
      owner: listing?.viewerIsOwner,
      commitment: listing?.commitment,
    },
    {
      source: "opportunity",
      organization: "Garden Co",
      neighbourhood: "Kensington",
      precise: true,
      owner: true,
      commitment: "5+ hrs / week",
    },
  );
  assert.deepEqual(listing?.skills, ["react"]);
  assert.equal(
    opportunityListing(
      job({ place: undefined, latitude: undefined, longitude: undefined }),
      null,
    ),
    null,
  );
  assert.equal(
    opportunityListing(job({ latitude: 43.65, longitude: -79.38 }), null),
    null,
  );
  assert.equal(opportunityListing({ ...job(), status: "closed" }, null), null);
});

test("request location and requester identity depend on who is looking", () => {
  const guest = requestListing(request(), null)!;
  assert.equal(guest.precise, false);
  assert.equal(guest.latitude, 51.06);
  assert.equal(guest.longitude, -114.07);
  assert.equal(guest.organization, "Calgary neighbour");
  assert.equal(guest.neighbourhood, "Approximate area");
  assert.ok(!JSON.stringify(guest).includes("Garden Lane"));
  assert.ok(!JSON.stringify(guest).includes("Pat"));
  for (const role of ["company", "recruiter", "requester"] as const)
    assert.equal(requestListing(request(), { id: "x", role })?.precise, false);
  const developer = requestListing(request(), {
    id: "dev",
    role: "developer",
  })!;
  assert.equal(developer.precise, true);
  assert.equal(developer.organization, "Pat Neighbour");
  const owner = requestListing(request(), {
    id: "neighbour",
    role: "requester",
  })!;
  assert.equal(owner.viewerIsOwner, true);
  assert.equal(owner.neighbourhood, "12 Garden Lane NW");
});

test("claimed requests are visible only to the people involved; closed ones never", () => {
  const claimed = request("claimed", "dev");
  assert.equal(requestListing(claimed, null), null);
  assert.equal(
    requestListing(claimed, { id: "other", role: "developer" }),
    null,
  );
  assert.equal(
    requestListing(claimed, { id: "dev", role: "developer" })?.viewerHasClaimed,
    true,
  );
  assert.equal(
    requestListing(claimed, { id: "neighbour", role: "requester" })?.status,
    "claimed",
  );
  assert.equal(
    requestListing(request("closed"), { id: "neighbour", role: "requester" }),
    null,
  );
});

test("an opportunity's map pin is all or nothing", () => {
  assert.ok(opportunitySchema.safeParse(pinned).success);
  assert.ok(opportunitySchema.safeParse(details).success);
  const partial = opportunitySchema.safeParse({ ...details, latitude: 51.05 });
  assert.equal(partial.success, false);
  assert.deepEqual(partial.error?.issues[0].path, ["latitude"]);
  assert.equal(
    opportunitySchema.safeParse({ ...pinned, compensation: "x".repeat(81) })
      .success,
    false,
  );
});

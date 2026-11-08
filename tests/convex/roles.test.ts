import { expect, test } from "vitest";
import {
  actor,
  analysis,
  api,
  embedding,
  job,
  profile,
  setup,
} from "./harness";

const kensington = { latitude: 51.052512, longitude: -114.086531 };
const pinnedJob = {
  ...job,
  city: "Calgary",
  place: "Kensington",
  ...kensington,
  compensation: "$1,200 project",
  commitment: "2-3 weeks",
};
const neighbourRequest = {
  title: "Garden club website",
  description: "We need a simple website for our neighbourhood garden club.",
  place: "12 Garden Lane NW",
  latitude: 51.061234,
  longitude: -114.071234,
};

async function developerNear(t: ReturnType<typeof setup>) {
  const dev = await actor(t, "developer");
  await dev.client.mutation(api.data.putDeveloper, {
    profile: { ...profile, city: "Calgary" },
    embedding,
  });
  await dev.client.mutation(api.data.setLocation, {
    location: { ...kensington, radiusKm: 10 },
  });
  return dev;
}

test("the public map lists only open, pinned Calgary postings and hides requester details", async () => {
  const t = setup();
  const company = await actor(t, "requester");
  const requester = await actor(t, "requester");
  const post = (details: typeof pinnedJob | typeof job) =>
    company.client.mutation(api.data.createOpportunity, {
      id: crypto.randomUUID(),
      details,
      analysis,
      embedding,
    });
  const shown = await post(pinnedJob);
  await post(job); // No pin: remote or elsewhere, so not on the map.
  await post({ ...pinnedJob, latitude: 43.65, longitude: -79.38 }); // Toronto
  const closed = await post(pinnedJob);
  await company.client.mutation(api.data.updateOpportunity, {
    id: closed.id,
    status: "closed",
  });
  const open = await requester.client.mutation(api.data.createRequest, {
    id: crypto.randomUUID(),
    details: neighbourRequest,
    analysis,
    embedding,
  });

  const guest = await t.query(api.data.mapListings, {});
  expect(guest.viewer).toBeNull();
  expect(guest.listings.map((listing) => listing.id).sort()).toEqual(
    [shown.id, open.id].sort(),
  );
  const job0 = guest.listings.find((listing) => listing.id === shown.id)!;
  expect(job0).toMatchObject({
    source: "opportunity",
    organization: "requester",
    compensation: "$1,200 project",
    precise: true,
    viewerIsOwner: false,
    ...kensington,
  });
  const anonymous = guest.listings.find((listing) => listing.id === open.id)!;
  expect(anonymous).toMatchObject({
    source: "request",
    organization: "Calgary neighbour",
    neighbourhood: "Approximate area",
    precise: false,
    latitude: 51.06,
    longitude: -114.07,
  });
  expect(JSON.stringify(guest)).not.toContain("Garden Lane");
  expect(JSON.stringify(guest)).not.toContain("Garden Lane");

  const owner = await requester.client.query(api.data.mapListings, {});
  expect(owner.viewer).toEqual({ name: "requester", role: "requester" });
  expect(owner.listings.find((l) => l.id === open.id)).toMatchObject({
    precise: true,
    viewerIsOwner: true,
    neighbourhood: neighbourRequest.place,
  });
  const companyView = await company.client.query(api.data.mapListings, {});
  expect(
    companyView.listings.find((l) => l.id === shown.id)?.viewerIsOwner,
  ).toBe(true);
  expect(companyView.listings.find((l) => l.id === open.id)?.precise).toBe(
    false,
  );
});

test("claimed requests stay on the map only for the requester and claimant", async () => {
  const t = setup();
  const requester = await actor(t, "requester");
  const claimant = await developerNear(t);
  const other = await developerNear(t);
  const posted = await requester.client.mutation(api.data.createRequest, {
    id: crypto.randomUUID(),
    details: neighbourRequest,
    analysis,
    embedding,
  });
  expect(
    (await other.client.query(api.data.mapListings, {})).listings[0],
  ).toMatchObject({ precise: true, organization: "requester" });
  await claimant.client.mutation(api.data.acceptRequest, {
    id: posted.id,
  });
  const ids = async (client: typeof requester.client | null) =>
    (
      await (client
        ? client.query(api.data.mapListings, {})
        : t.query(api.data.mapListings, {}))
    ).listings.map((listing) => [listing.id, listing.status]);
  expect(await ids(null)).toEqual([]);
  expect(await ids(other.client)).toEqual([]);
  expect(await ids(claimant.client)).toEqual([[posted.id, "claimed"]]);
  expect(await ids(requester.client)).toEqual([[posted.id, "claimed"]]);
  expect(
    (
      await claimant.client.query(api.data.claimedRequests, {
        after: "",
        limit: 20,
      })
    ).data.map((request) => request.id),
  ).toEqual([posted.id]);
  await claimant.client.mutation(api.data.releaseRequest, {
    id: posted.id,
  });
  expect(
    (
      await claimant.client.query(api.data.claimedRequests, {
        after: "",
        limit: 20,
      })
    ).data,
  ).toEqual([]);
});

test("only owners edit postings, and claimed or closed requests are locked", async () => {
  const t = setup();
  const company = await actor(t, "requester");
  const rival = await actor(t, "requester");
  const requester = await actor(t, "requester");
  const neighbour = await actor(t, "requester");
  const claimant = await developerNear(t);

  const posted = await company.client.mutation(api.data.createOpportunity, {
    id: crypto.randomUUID(),
    details: pinnedJob,
    analysis,
    embedding,
  });
  await company.client.mutation(api.data.updateOpportunity, {
    id: posted.id,
    status: "closed",
  });
  const revised = { ...pinnedJob, title: "A refreshed café website" };
  await expect(
    rival.client.mutation(api.data.reviseOpportunity, {
      id: posted.id,
      details: revised,
      analysis,
      embedding,
    }),
  ).rejects.toThrow(/owner/);
  await expect(
    company.client.mutation(api.data.reviseOpportunity, {
      id: posted.id,
      details: revised,
      analysis,
      embedding,
    }),
  ).resolves.toMatchObject({ title: revised.title, status: "closed" });
  const mine = await company.client.query(api.data.ownedOpportunities, {
    after: "",
    limit: 20,
  });
  expect(mine.data.map((item) => [item.title, item.status])).toEqual([
    [revised.title, "closed"],
  ]);
  expect(
    (
      await rival.client.query(api.data.ownedOpportunities, {
        after: "",
        limit: 20,
      })
    ).data,
  ).toEqual([]);

  const request = await requester.client.mutation(api.data.createRequest, {
    id: crypto.randomUUID(),
    details: neighbourRequest,
    analysis,
    embedding,
  });
  const edit = (client: typeof requester.client, title: string) =>
    client.mutation(api.data.reviseRequest, {
      id: request.id,
      details: { ...neighbourRequest, title },
      analysis,
      embedding,
    });
  await expect(edit(neighbour.client, "Taken over")).rejects.toThrow(
    /Only the requester/,
  );
  await expect(
    edit(requester.client, "Garden club site"),
  ).resolves.toMatchObject({ title: "Garden club site", status: "open" });
  await claimant.client.mutation(api.data.acceptRequest, {
    id: request.id,
  });
  await expect(edit(requester.client, "Moved")).rejects.toThrow(/Release/);
  await requester.client.mutation(api.data.closeRequest, {
    id: request.id,
  });
  await expect(edit(requester.client, "Reopened")).rejects.toThrow(/Closed/);
});

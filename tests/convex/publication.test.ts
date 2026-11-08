import { expect, test } from "vitest";
import { actor, analysis, api, embedding, job, setup } from "./harness";

test("publication is deduplicated and cannot be reused by another owner or changed details", async () => {
  const t = setup();
  const company = await actor(t, "requester");
  const other = await actor(t, "requester");
  const input = { id: crypto.randomUUID(), details: job, analysis, embedding };
  await company.client.mutation(api.data.createOpportunity, input);
  await company.client.mutation(api.data.createOpportunity, input);
  expect(
    (
      await company.client.query(api.data.ownedOpportunities, {
        after: "",
        limit: 20,
      })
    ).data,
  ).toHaveLength(1);
  await expect(
    other.client.mutation(api.data.createOpportunity, input),
  ).rejects.toThrow(/already published/);
  await expect(
    company.client.mutation(api.data.createOpportunity, {
      ...input,
      details: { ...job, title: "Changed" },
    }),
  ).rejects.toThrow(/already published/);
});

test("request publication retries return a single owner record", async () => {
  const t = setup();
  const owner = await actor(t, "requester");
  const input = {
    id: crypto.randomUUID(),
    details: {
      title: "Community calendar",
      description: job.description,
      place: "Calgary",
      latitude: 51.05,
      longitude: -114.08,
    },
    analysis,
    embedding,
  };
  await owner.client.mutation(api.data.createRequest, input);
  await owner.client.mutation(api.data.createRequest, input);
  expect(
    (await owner.client.query(api.data.ownedRequests, { after: "", limit: 20 }))
      .data,
  ).toHaveLength(1);
});

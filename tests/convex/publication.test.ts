import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { actor, analysis, api, embedding, job, secret, setup } from "./harness";

beforeEach(() => vi.stubEnv("CONVEX_BRIDGE_SECRET", secret));
afterEach(() => vi.unstubAllEnvs());

test("retries publish one opportunity and reject key reuse by another owner or payload", async () => {
  const t = setup();
  const company = await actor(t, "company");
  const other = await actor(t, "company");
  const input = {
    secret,
    id: crypto.randomUUID(),
    details: job,
    analysis,
    embedding,
  };
  await company.client.mutation(api.data.createOpportunity, input);
  await company.client.mutation(api.data.createOpportunity, input);
  expect(
    (
      await company.client.query(api.data.ownedOpportunities, {
        secret,
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
      details: { ...job, title: "Different submission" },
    }),
  ).rejects.toThrow(/already published/);
});

test("request retries do not publish a second request", async () => {
  const t = setup();
  const owner = await actor(t, "requester");
  const input = {
    secret,
    id: crypto.randomUUID(),
    details: {
      title: "Community calendar",
      description: job.description,
      place: "Calgary",
      latitude: 51.04,
      longitude: -114.07,
    },
    analysis,
    embedding,
  };
  await owner.client.mutation(api.data.createRequest, input);
  await owner.client.mutation(api.data.createRequest, input);
  expect(
    (
      await owner.client.query(api.data.ownedRequests, {
        secret,
        after: "",
        limit: 20,
      })
    ).data,
  ).toHaveLength(1);
});

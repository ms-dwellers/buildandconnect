import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  actor,
  analysis,
  api,
  embedding,
  job,
  profile,
  secret,
  setup,
} from "./harness";

beforeEach(() => vi.stubEnv("CONVEX_BRIDGE_SECRET", secret));
afterEach(() => vi.unstubAllEnvs());

test("profile revision checks prevent stale native saves from undoing visibility changes", async () => {
  const t = setup();
  const developer = await actor(t, "developer");
  await developer.client.mutation(api.data.putDeveloper, {
    secret,
    profile,
    embedding,
  });
  const old = await developer.client.query(api.data.ownProfile, { secret });
  await developer.client.mutation(api.data.patchDeveloper, {
    secret,
    discoverable: false,
  });
  await expect(
    developer.client.mutation(api.data.putDeveloper, {
      secret,
      profile,
      embedding,
      expectedRevision: old.revision,
    }),
  ).rejects.toThrow(/changed on another device/);
  expect(
    (await developer.client.query(api.data.ownProfile, { secret }))
      .discoverable,
  ).toBe(false);
});

test("opportunity revisions reject concurrent edits while legacy callers remain compatible", async () => {
  const t = setup();
  const owner = await actor(t, "company");
  const { id } = await owner.client.mutation(api.data.createOpportunity, {
    secret,
    id: crypto.randomUUID(),
    details: job,
    analysis,
    embedding,
  });
  const first = await owner.client.query(api.data.getOpportunity, {
    secret,
    id,
  });
  await owner.client.mutation(api.data.reviseOpportunity, {
    secret,
    id,
    details: { ...job, title: "Latest title" },
    analysis,
    embedding,
    expectedRevision: first.revision,
  });
  await expect(
    owner.client.mutation(api.data.reviseOpportunity, {
      secret,
      id,
      details: job,
      analysis,
      embedding,
      expectedRevision: first.revision,
    }),
  ).rejects.toThrow(/changed on another device/);
  expect(
    (await owner.client.query(api.data.getOpportunity, { secret, id })).title,
  ).toBe("Latest title");
  await owner.client.mutation(api.data.reviseOpportunity, {
    secret,
    id,
    details: job,
    analysis,
    embedding,
  });
});

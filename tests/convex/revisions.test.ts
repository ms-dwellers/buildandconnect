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

test("profile revision checks prevent stale native saves from undoing visibility changes", async () => {
  const t = setup();
  const developer = await actor(t, "developer");
  await developer.client.mutation(api.data.putDeveloper, {
    profile,
    embedding,
  });
  const old = await developer.client.query(api.data.ownProfile, {});
  await developer.client.mutation(api.data.patchDeveloper, {
    discoverable: false,
  });
  await expect(
    developer.client.mutation(api.data.putDeveloper, {
      profile,
      embedding,
      expectedRevision: old.revision,
    }),
  ).rejects.toThrow(/changed on another device/);
  expect(
    (await developer.client.query(api.data.ownProfile, {})).discoverable,
  ).toBe(false);
});

test("opportunity revisions reject concurrent edits while legacy callers remain compatible", async () => {
  const t = setup();
  const owner = await actor(t, "requester");
  const { id } = await owner.client.mutation(api.data.createOpportunity, {
    id: crypto.randomUUID(),
    details: job,
    analysis,
    embedding,
  });
  const first = await owner.client.query(api.data.getOpportunity, { id });
  await owner.client.mutation(api.data.reviseOpportunity, {
    id,
    details: { ...job, title: "Latest title" },
    analysis,
    embedding,
    expectedRevision: first.revision,
  });
  await expect(
    owner.client.mutation(api.data.reviseOpportunity, {
      id,
      details: job,
      analysis,
      embedding,
      expectedRevision: first.revision,
    }),
  ).rejects.toThrow(/changed on another device/);
  expect(
    (await owner.client.query(api.data.getOpportunity, { id })).title,
  ).toBe("Latest title");
  await owner.client.mutation(api.data.reviseOpportunity, {
    id,
    details: job,
    analysis,
    embedding,
  });
});

import { expect, test } from "vitest";
import { setup, actor, api, analysis, embedding, profile } from "./harness";
import {
  emptyProjectDraft,
  opportunityFromDraft,
} from "../../backend/project-drafts";

const content = {
  ...emptyProjectDraft(),
  title: "Community calendar",
  description: "Build an accessible calendar for community garden events.",
  city: "Toronto",
  kind: "volunteer" as const,
  minimumWeeklyHours: "4",
};

test("project drafts are private, versioned, incomplete-friendly and owner-scoped", async () => {
  const t = setup();
  const owner = await actor(t, "requester");
  const other = await actor(t, "requester");
  const dev = await actor(t, "developer");
  const saved = await owner.client.mutation(api.data.saveProjectDraft, {
    id: "draft",
    content: emptyProjectDraft(),
    expectedUpdatedAt: 0,
  });
  expect(saved.content.title).toBe("");
  expect(await other.client.query(api.data.projectDrafts, {})).toEqual([]);
  await expect(
    other.client.query(api.data.getProjectDraft, { id: "draft" }),
  ).rejects.toThrow(/not found/);
  await expect(dev.client.query(api.data.projectDrafts, {})).rejects.toThrow(
    /role/,
  );
  await expect(
    t.query(api.data.projectDrafts, { sessionId: "missing" }),
  ).rejects.toThrow(/Sign in/);
  const changed = await owner.client.mutation(api.data.saveProjectDraft, {
    id: "draft",
    content,
    expectedUpdatedAt: saved.updatedAt,
  });
  await expect(
    owner.client.mutation(api.data.saveProjectDraft, {
      id: "draft",
      content: { ...content, title: "Stale overwrite" },
      expectedUpdatedAt: saved.updatedAt,
    }),
  ).rejects.toThrow(/another tab/);
  expect(
    await owner.client.query(api.data.getProjectDraft, { id: "draft" }),
  ).toEqual(changed);
  await expect(
    other.client.mutation(api.data.discardProjectDraft, {
      id: "draft",
      expectedUpdatedAt: changed.updatedAt,
    }),
  ).rejects.toThrow(/not found/);
  await owner.client.mutation(api.data.discardProjectDraft, {
    id: "draft",
    expectedUpdatedAt: changed.updatedAt,
  });
  expect(await owner.client.query(api.data.projectDrafts, {})).toEqual([]);
});

test("publishing atomically links the saved draft and duplicate requests create one opportunity", async () => {
  const t = setup();
  const owner = await actor(t, "requester");
  const other = await actor(t, "requester");
  const saved = await owner.client.mutation(api.data.saveProjectDraft, {
    id: "publish",
    content,
    expectedUpdatedAt: 0,
  });
  const args = {
    id: "draft-publish",
    details: opportunityFromDraft(content),
    analysis,
    embedding,
    draftId: saved.id,
    draftUpdatedAt: saved.updatedAt,
  };
  await expect(
    other.client.mutation(api.data.createOpportunity, args),
  ).rejects.toThrow(/not found/);
  await expect(
    owner.client.mutation(api.data.createOpportunity, {
      ...args,
      draftUpdatedAt: 0,
    }),
  ).rejects.toThrow(/changed/);
  await expect(
    owner.client.mutation(api.data.createOpportunity, {
      ...args,
      details: { ...args.details, title: "Different" },
    }),
  ).rejects.toThrow(/match/);
  const results = await Promise.all([
    owner.client.mutation(api.data.createOpportunity, args),
    owner.client.mutation(api.data.createOpportunity, args),
  ]);
  expect(results[0].id).toBe(results[1].id);
  expect(
    await t.run((ctx) => ctx.db.query("opportunities").collect()),
  ).toHaveLength(1);
  expect(await owner.client.query(api.data.projectDrafts, {})).toEqual([]);
  const published = await owner.client.query(api.data.getProjectDraft, {
    id: saved.id,
  });
  expect(published.publishedOpportunityId).toBe("draft-publish");
  await expect(
    owner.client.mutation(api.data.saveProjectDraft, {
      id: saved.id,
      content,
      expectedUpdatedAt: published.updatedAt,
    }),
  ).rejects.toThrow(/already been published/);
});

test("request review reports eligibility and concurrent claims remain exclusive", async () => {
  const t = setup();
  const owner = await actor(t, "requester");
  const a = await actor(t, "developer");
  const b = await actor(t, "developer");
  await owner.client.mutation(api.data.createRequest, {
    id: "review",
    details: {
      title: "Garden calendar",
      description: content.description,
      place: "Toronto",
      latitude: 43.65,
      longitude: -79.38,
    },
    analysis,
    embedding,
  });
  expect(
    (await a.client.query(api.data.ownRequestMatch, { id: "review" }))
      .ineligibleReasons,
  ).toEqual(["Create your developer profile first"]);
  for (const dev of [a, b]) {
    await dev.client.mutation(api.data.putDeveloper, {
      profile,
      embedding,
    });
    await dev.client.mutation(api.data.setLocation, {
      location: { latitude: 43.65, longitude: -79.38, radiusKm: 5 },
    });
  }
  expect(
    (await a.client.query(api.data.ownRequestMatch, { id: "review" }))
      .ineligibleReasons,
  ).toEqual([]);
  const claims = await Promise.allSettled(
    [a, b].map((dev) =>
      dev.client.mutation(api.data.acceptRequest, { id: "review" }),
    ),
  );
  expect(claims.filter((result) => result.status === "fulfilled")).toHaveLength(
    1,
  );
  const saved = await owner.client.query(api.data.getRequest, {
    id: "review",
  });
  expect(saved.status).toBe("claimed");
  expect([a.id, b.id]).toContain(saved.claimedBy);
  const loser = saved.claimedBy === a.id ? b : a;
  await expect(
    loser.client.query(api.data.ownRequestMatch, { id: "review" }),
  ).rejects.toThrow(/available/);
});

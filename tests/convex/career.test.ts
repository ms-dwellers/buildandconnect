import type { FunctionReturnType } from "convex/server";
import { beforeEach, afterEach, expect, test, vi } from "vitest";
import {
  actor,
  api,
  components,
  setup,
  profile,
  job,
  analysis,
  embedding,
} from "./harness";
import { careerTarget } from "../fixtures/career";
import { analyzeCareerTarget } from "../../backend/career/analysis";
import {
  analyzeDeveloper,
  analyzeOpportunity,
  analyzeRequest,
  type AIService,
} from "../../backend/ai";
import { handleApi } from "../../convex/api";
import type { ActionCtx } from "../../convex/_generated/server";

beforeEach(() => {
  vi.stubEnv("SITE_URL", "https://app.example.test");
  vi.stubEnv("CONVEX_SITE_URL", "https://test.convex.site");
  vi.stubEnv(
    "BETTER_AUTH_SECRET",
    "career-test-only-secret-at-least-32-characters",
  );
});
afterEach(() => vi.unstubAllEnvs());

async function httpClient(
  t: ReturnType<typeof setup>,
  member: Awaited<ReturnType<typeof actor>>,
  ai?: AIService,
) {
  const session = await t.run((ctx) =>
    ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "session",
      where: [{ field: "_id", value: member.sessionId }],
    }),
  );
  if (!session || !("token" in session))
    throw new Error("Test session missing");
  return {
    request(path: string, init: RequestInit = {}) {
      const headers = new Headers(init.headers);
      headers.set("Authorization", `Bearer ${session.token}`);
      headers.set("Content-Type", "application/json");
      return t.run((ctx) =>
        handleApi(
          ctx as unknown as ActionCtx,
          new Request(`https://test.convex.site${path}`, { ...init, headers }),
          {
            analyzeDeveloper,
            analyzeOpportunity,
            analyzeRequest,
            analyzeCareerTarget: (_binding, input) =>
              analyzeCareerTarget(ai, input),
          },
        ),
      );
    },
  };
}

test("career target HTTP flow saves analyzed source, remains private, and preserves previous data on failure", async () => {
  const t = setup();
  const dev = await actor(t, "developer");
  const other = await actor(t, "developer");
  const company = await actor(t, "requester");
  const output = {
    title: careerTarget.title,
    requirements: careerTarget.requirements,
  };
  const run = vi.fn(async () => ({ response: JSON.stringify(output) }));
  const app = await httpClient(t, dev, { run });
  const path = "/api/developers/me/career-target";
  expect(await (await app.request(path)).json()).toBeNull();
  const save = await app.request(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourceText: careerTarget.sourceText }),
  });
  expect(save.status).toBe(200);
  const saved = await save.json();
  expect(saved).toMatchObject({
    ...careerTarget,
    developerId: dev.id,
    analysisVersion: "career-v1",
  });
  expect(await dev.client.query(api.data.ownCareerTarget, {})).toEqual(saved);
  const stale = await app.request(path, {
    method: "PUT",
    body: JSON.stringify({
      sourceText: careerTarget.sourceText,
      expectedUpdatedAt: 0,
    }),
  });
  expect(stale.status).toBe(409);
  expect(run).toHaveBeenCalledTimes(1);
  expect(await other.client.query(api.data.ownCareerTarget, {})).toBeNull();
  expect(
    (await t.run((ctx) => ctx.db.query("careerTargets").collect())).length,
  ).toBe(1);

  run.mockResolvedValueOnce({ response: "{}" });
  const failed = await app.request(path, {
    method: "PUT",
    body: JSON.stringify({ sourceText: careerTarget.sourceText }),
  });
  expect(failed.status).toBe(503);
  expect(await dev.client.query(api.data.ownCareerTarget, {})).toEqual(saved);
  expect(
    (
      await app.request(path, {
        method: "PUT",
        body: JSON.stringify({
          sourceText: careerTarget.sourceText,
          requirements: [],
        }),
      })
    ).status,
  ).toBe(400);

  const forbidden = await httpClient(t, company, { run });
  expect(
    (
      await forbidden.request(path, {
        method: "PUT",
        body: JSON.stringify({ sourceText: careerTarget.sourceText }),
      })
    ).status,
  ).toBe(403);
  await expect(
    company.client.query(api.data.ownCareerTarget, {}),
  ).rejects.toThrow(/role/);
});

test("career persistence revalidates sessions, quotes, and concurrent saves", async () => {
  const t = setup();
  const dev = await actor(t, "developer");
  await expect(t.query(api.data.ownCareerTarget, {})).rejects.toThrow(
    /Sign in/,
  );
  await expect(
    t.query(api.data.ownCareerTarget, { sessionId: "missing" }),
  ).rejects.toThrow(/Sign in/);
  const saved = await dev.client.mutation(api.data.putCareerTarget, {
    target: careerTarget,
    expectedUpdatedAt: 0,
  });
  await expect(
    dev.client.mutation(api.data.putCareerTarget, {
      target: careerTarget,
      expectedUpdatedAt: 0,
    }),
  ).rejects.toThrow(/changed/);
  await expect(
    dev.client.mutation(api.data.putCareerTarget, {
      expectedUpdatedAt: saved.updatedAt,
      target: {
        ...careerTarget,
        requirements: [
          {
            ...careerTarget.requirements[0],
            sourceQuote: "Not in the description",
          },
        ],
      },
    }),
  ).rejects.toThrow(/quotes/);
  await t.run((ctx) =>
    ctx.runMutation(components.betterAuth.adapter.deleteOne, {
      input: {
        model: "session",
        where: [{ field: "_id", value: dev.sessionId }],
      },
    }),
  );
  await expect(
    dev.client.mutation(api.data.putCareerTarget, {
      target: careerTarget,
      expectedUpdatedAt: saved.updatedAt,
    }),
  ).rejects.toThrow(/Sign in/);
});

test("simultaneous first saves produce one target and reject the stale analysis", async () => {
  const t = setup();
  const dev = await actor(t, "developer");
  const saves = await Promise.allSettled(
    ["First target", "Second target"].map((title) =>
      dev.client.mutation(api.data.putCareerTarget, {
        target: { ...careerTarget, title },
        expectedUpdatedAt: 0,
      }),
    ),
  );
  expect(saves.filter((save) => save.status === "fulfilled")).toHaveLength(1);
  expect(saves.filter((save) => save.status === "rejected")).toHaveLength(1);
  expect(
    await t.run((ctx) => ctx.db.query("careerTargets").collect()),
  ).toHaveLength(1);
});

test("career recommendations join open projects, prioritize gaps, and keep private exploration read-only", async () => {
  const t = setup();
  const dev = await actor(t, "developer");
  const company = await actor(t, "requester");
  const requester = await actor(t, "requester");
  await dev.client.mutation(api.data.putDeveloper, {
    profile: { ...profile, discoverable: false, wantsToLearn: [] },
    embedding,
  });
  await dev.client.mutation(api.data.setLocation, {
    location: { latitude: 43.65, longitude: -79.38, radiusKm: 25 },
  });
  await dev.client.mutation(api.data.putCareerTarget, {
    target: careerTarget,
    expectedUpdatedAt: 0,
  });
  const activities = [
    { id: "forms", description: "Build typed forms", skills: ["typescript"] },
    {
      id: "login",
      description: "Build staff login",
      skills: ["authentication"],
    },
  ];
  for (const id of ["legacy", "growth", "closed", "blocked"]) {
    await company.client.mutation(api.data.createOpportunity, {
      id,
      details: {
        ...job,
        essentialTechnologies:
          id === "blocked" ? ["rust"] : job.essentialTechnologies,
      },
      analysis: id === "legacy" ? analysis : { ...analysis, activities },
      embedding,
    });
  }
  await company.client.mutation(api.data.updateOpportunity, {
    id: "closed",
    status: "closed",
  });
  for (const [id, latitude] of [
    ["nearby", 43.66],
    ["faraway", 45],
    ["claimed", 43.66],
  ] as const) {
    await requester.client.mutation(api.data.createRequest, {
      id,
      details: {
        title: "Food bank scheduling",
        description: job.description,
        place: "Toronto",
        latitude,
        longitude: -79.38,
      },
      analysis: { ...analysis, activities },
      embedding,
    });
  }
  await t.run(async (ctx) => {
    const claimed = await ctx.db
      .query("requests")
      .withIndex("by_public_id", (q) => q.eq("id", "claimed"))
      .unique();
    await ctx.db.patch(claimed!._id, {
      status: "claimed",
      claimedBy: "another-developer",
      claimantName: "Other",
    });
  });
  const before = await t.run(async (ctx) => ({
    requests: await ctx.db.query("requests").collect(),
    opportunities: await ctx.db.query("opportunities").collect(),
    interests: await ctx.db.query("interests").collect(),
  }));
  const app = await httpClient(t, dev);
  const response = await app.request(
    "/api/developers/me/career-projects?limit=10",
  );
  expect(response.status).toBe(200);
  const result = (await response.json()) as FunctionReturnType<
    typeof api.data.careerRecommendations
  >;
  expect(result.data.map((item: { id: string }) => item.id).sort()).toEqual([
    "growth",
    "legacy",
    "nearby",
  ]);
  expect(result.data[2].id).toBe("legacy");
  expect(result.data[0].careerRelevance.gapRequirementsWithPractice).toBe(2);
  expect(
    result.data.every(
      (item: { actionIneligibleReasons: string[] }) =>
        item.actionIneligibleReasons.length > 0,
    ),
  ).toBe(true);
  expect(
    result.requirements.find((item: { id: string }) => item.id === "degree")
      ?.evidenceStatus,
  ).toBe("needs_evidence");
  expect(JSON.stringify(result)).not.toMatch(
    /embedding|sourceText|ownerName|claimantName/,
  );
  expect(result.total).toBe(3);
  expect(result.nearbyRequestsAvailable).toBe(true);
  expect(
    (await app.request("/api/developers/me/career-projects?limit=101")).status,
  ).toBe(400);
  expect(
    (await app.request("/api/developers/me/career-projects?after=cursor"))
      .status,
  ).toBe(400);
  expect(
    await t.run(async (ctx) => ({
      requests: await ctx.db.query("requests").collect(),
      opportunities: await ctx.db.query("opportunities").collect(),
      interests: await ctx.db.query("interests").collect(),
    })),
  ).toEqual(before);
  await expect(
    company.client.query(api.data.careerRecommendations, { limit: 20 }),
  ).rejects.toThrow(/role/);
  await expect(
    t.query(api.data.careerRecommendations, { limit: 20 }),
  ).rejects.toThrow(/Sign in/);
});

test("career recommendations handle missing setup and bound candidate pools rather than truncating", async () => {
  const t = setup();
  const dev = await actor(t, "developer");
  const query = (limit = 20) =>
    dev.client.query(api.data.careerRecommendations, { limit });
  await expect(query()).rejects.toThrow(/career target/);
  await dev.client.mutation(api.data.putCareerTarget, {
    target: careerTarget,
    expectedUpdatedAt: 0,
  });
  await expect(query()).rejects.toThrow(/profile/);
  await dev.client.mutation(api.data.putDeveloper, {
    profile,
    embedding,
  });
  expect(await query()).toMatchObject({
    data: [],
    total: 0,
    nearbyRequestsAvailable: false,
  });
  await expect(query(0)).rejects.toThrow(/Limit/);
  await t.run(async (ctx) => {
    for (let index = 0; index < 1001; index++) {
      await ctx.db.insert("opportunities", {
        id: `posting-${index}`,
        ownerId: "company",
        ownerName: "Company",
        cityKey: "toronto",
        details: job,
        analysis,
        embedding,
        analysisModel: "test",
        analysisVersion: "job-v1",
        embeddingModel: "test",
        status: "open",
        createdAt: Date.now(),
      });
    }
  });
  await expect(query()).rejects.toThrow(/MVP limit/);
});

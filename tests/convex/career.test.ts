import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { ConvexError } from "convex/values";
import type { ConvexHttpClient } from "convex/browser";
import type { FunctionReturnType } from "convex/server";
import { ZodError } from "zod";
import { beforeEach, afterEach, expect, test, vi } from "vitest";
import {
  actor,
  api,
  components,
  secret,
  setup,
  profile,
  job,
  analysis,
  embedding,
} from "./harness";
import { careerTarget } from "../fixtures/career";
import { createCareerRoutes } from "../../backend/career/routes";
import { AnalysisUnavailable } from "../../backend/ai";
import type { ApiEnv } from "../../backend/api";
import type { Role } from "../../backend/schemas";

beforeEach(() => vi.stubEnv("CONVEX_BRIDGE_SECRET", secret));
afterEach(() => vi.unstubAllEnvs());

function httpClient(
  client: Awaited<ReturnType<typeof actor>>["client"],
  role: Role,
  ai?: Ai,
) {
  const app = new Hono<ApiEnv>();
  app.use("*", async (c, next) => {
    c.env = { CONVEX_BRIDGE_SECRET: secret, AI: ai } as ApiEnv["Bindings"];
    c.set("role", role);
    c.set("client", client as unknown as ConvexHttpClient);
    await next();
  });
  app.route("/api/developers/me", createCareerRoutes());
  app.onError((error, c) => {
    if (error instanceof HTTPException)
      return c.json({ error: error.message }, error.status);
    if (error instanceof ZodError)
      return c.json({ error: "Invalid fields" }, 400);
    if (error instanceof AnalysisUnavailable)
      return c.json({ error: error.message }, 503);
    if (error instanceof ConvexError)
      return c.json(error.data, error.data.status);
    throw error;
  });
  return app;
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
  const app = httpClient(dev.client, "developer", { run } as unknown as Ai);
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
  expect(await dev.client.query(api.data.ownCareerTarget, { secret })).toEqual(
    saved,
  );
  const stale = await app.request(path, {
    method: "PUT",
    body: JSON.stringify({
      sourceText: careerTarget.sourceText,
      expectedUpdatedAt: 0,
    }),
  });
  expect(stale.status).toBe(409);
  expect(run).toHaveBeenCalledTimes(1);
  expect(
    await other.client.query(api.data.ownCareerTarget, { secret }),
  ).toBeNull();
  expect(
    (await t.run((ctx) => ctx.db.query("careerTargets").collect())).length,
  ).toBe(1);

  run.mockResolvedValueOnce({ response: "{}" });
  const failed = await app.request(path, {
    method: "PUT",
    body: JSON.stringify({ sourceText: careerTarget.sourceText }),
  });
  expect(failed.status).toBe(503);
  expect(await dev.client.query(api.data.ownCareerTarget, { secret })).toEqual(
    saved,
  );
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

  const forbidden = httpClient(company.client, "requester", {
    run,
  } as unknown as Ai);
  expect(
    (
      await forbidden.request(path, {
        method: "PUT",
        body: JSON.stringify({ sourceText: careerTarget.sourceText }),
      })
    ).status,
  ).toBe(403);
  await expect(
    company.client.query(api.data.ownCareerTarget, { secret }),
  ).rejects.toThrow(/role/);
});

test("career persistence revalidates sessions, quotes, and concurrent saves", async () => {
  const t = setup();
  const dev = await actor(t, "developer");
  await expect(t.query(api.data.ownCareerTarget, { secret })).rejects.toThrow(
    /Sign in/,
  );
  await expect(
    dev.client.query(api.data.ownCareerTarget, { secret: "wrong" }),
  ).rejects.toThrow(/application API/);
  const saved = await dev.client.mutation(api.data.putCareerTarget, {
    secret,
    target: careerTarget,
    expectedUpdatedAt: 0,
  });
  await expect(
    dev.client.mutation(api.data.putCareerTarget, {
      secret,
      target: careerTarget,
      expectedUpdatedAt: 0,
    }),
  ).rejects.toThrow(/changed/);
  await expect(
    dev.client.mutation(api.data.putCareerTarget, {
      secret,
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
      secret,
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
        secret,
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
    secret,
    profile: { ...profile, discoverable: false, wantsToLearn: [] },
    embedding,
  });
  await dev.client.mutation(api.data.setLocation, {
    secret,
    location: { latitude: 43.65, longitude: -79.38, radiusKm: 25 },
  });
  await dev.client.mutation(api.data.putCareerTarget, {
    secret,
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
      secret,
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
    secret,
    id: "closed",
    status: "closed",
  });
  for (const [id, latitude] of [
    ["nearby", 43.66],
    ["faraway", 45],
    ["claimed", 43.66],
  ] as const) {
    await requester.client.mutation(api.data.createRequest, {
      secret,
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
  const app = httpClient(dev.client, "developer");
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
    company.client.query(api.data.careerRecommendations, { secret, limit: 20 }),
  ).rejects.toThrow(/role/);
  await expect(
    t.query(api.data.careerRecommendations, { secret, limit: 20 }),
  ).rejects.toThrow(/Sign in/);
});

test("career recommendations handle missing setup and bound candidate pools rather than truncating", async () => {
  const t = setup();
  const dev = await actor(t, "developer");
  const query = (limit = 20) =>
    dev.client.query(api.data.careerRecommendations, { secret, limit });
  await expect(query()).rejects.toThrow(/career target/);
  await dev.client.mutation(api.data.putCareerTarget, {
    secret,
    target: careerTarget,
    expectedUpdatedAt: 0,
  });
  await expect(query()).rejects.toThrow(/profile/);
  await dev.client.mutation(api.data.putDeveloper, {
    secret,
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

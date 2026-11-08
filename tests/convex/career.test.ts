import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { ConvexError } from "convex/values";
import type { ConvexHttpClient } from "convex/browser";
import { ZodError } from "zod";
import { beforeEach, afterEach, expect, test, vi } from "vitest";
import { actor, api, components, secret, setup } from "./harness";
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
  const company = await actor(t, "company");
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

  const forbidden = httpClient(company.client, "company", {
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

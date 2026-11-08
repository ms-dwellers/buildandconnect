import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { api as convex } from "../../convex/_generated/api.js";
import type { ApiEnv } from "../api.ts";
import { analyzeCareerTarget } from "./analysis.ts";
import { careerTargetInputSchema } from "./schemas.ts";

export function createCareerRoutes(analyze = analyzeCareerTarget) {
  const routes = new Hono<ApiEnv>();
  routes.use("*", async (c, next) => {
    if (c.get("role") !== "developer")
      throw new HTTPException(403, {
        message: "Career targets require a developer account",
      });
    await next();
  });
  routes.get("/career-target", async (c) =>
    c.json(
      await c.get("client").query(convex.data.ownCareerTarget, {
        secret: c.env.CONVEX_BRIDGE_SECRET,
      }),
    ),
  );
  routes.put("/career-target", async (c) => {
    const { expectedUpdatedAt, ...input } = careerTargetInputSchema
      .extend({
        expectedUpdatedAt: z.number().int().nonnegative().optional(),
      })
      .parse(await c.req.json());
    const current = await c.get("client").query(convex.data.ownCareerTarget, {
      secret: c.env.CONVEX_BRIDGE_SECRET,
    });
    if (
      expectedUpdatedAt !== undefined &&
      expectedUpdatedAt !== (current?.updatedAt ?? 0)
    )
      throw new HTTPException(409, {
        message: "Your career target changed. Reload it before saving again.",
      });
    const target = await analyze(c.env.AI, input);
    return c.json(
      await c.get("client").mutation(convex.data.putCareerTarget, {
        secret: c.env.CONVEX_BRIDGE_SECRET,
        target,
        expectedUpdatedAt: expectedUpdatedAt ?? current?.updatedAt ?? 0,
      }),
    );
  });
  routes.get("/career-projects", async (c) => {
    const { limit } = z
      .object({
        limit: z.coerce.number().int().min(1).max(100).default(20),
      })
      .strict()
      .parse(c.req.query());
    return c.json(
      await c.get("client").query(convex.data.careerRecommendations, {
        secret: c.env.CONVEX_BRIDGE_SECRET,
        limit,
      }),
    );
  });
  return routes;
}

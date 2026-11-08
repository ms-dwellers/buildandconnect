import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
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
    const input = careerTargetInputSchema.parse(await c.req.json());
    const current = await c.get("client").query(convex.data.ownCareerTarget, {
      secret: c.env.CONVEX_BRIDGE_SECRET,
    });
    const target = await analyze(c.env.AI, input);
    return c.json(
      await c.get("client").mutation(convex.data.putCareerTarget, {
        secret: c.env.CONVEX_BRIDGE_SECRET,
        target,
        expectedUpdatedAt: current?.updatedAt ?? 0,
      }),
    );
  });
  return routes;
}

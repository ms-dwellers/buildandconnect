import { Hono, type Context } from "hono";
import { bodyLimit } from "hono/body-limit";
import { HTTPException } from "hono/http-exception";
import { ConvexError } from "convex/values";
import type { ConvexHttpClient } from "convex/browser";
import { z, ZodError } from "zod";
import { api as convex } from "../convex/_generated/api";
import {
  createAuthenticatedClient,
  createOptionalClient,
  isConfigured,
  proxyAuth,
} from "./auth";
import {
  analyzeDeveloper,
  analyzeOpportunity,
  analyzeRequest,
  AnalysisUnavailable,
} from "./ai";
import {
  developerLocationSchema,
  developerPreferencesSchema,
  developerSchema,
  opportunitySchema,
  requestSchema,
  type Role,
} from "./schemas";
import type { BackendEnv } from "./env";
import { createHiringRoutes } from "./hiring/routes";
import { HiringProviderError } from "./hiring/providers";
import { createCareerRoutes } from "./career/routes";
import type { analyzeCareerTarget } from "./career/analysis";
import {
  opportunityFromDraft,
  projectDraftContentSchema,
} from "./project-drafts";

export type ApiEnv = {
  Bindings: BackendEnv;
  Variables: { client: ConvexHttpClient; role: Role | null };
};
type ApiContext = Context<ApiEnv>;
type AnalysisServices = {
  analyzeDeveloper: typeof analyzeDeveloper;
  analyzeOpportunity: typeof analyzeOpportunity;
  analyzeRequest: typeof analyzeRequest;
  analyzeCareerTarget?: typeof analyzeCareerTarget;
};
const pagination = z.object({
  after: z.string().max(100).default(""),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
const client = (c: ApiContext) => c.get("client");
const secret = (c: ApiContext) => c.env.CONVEX_BRIDGE_SECRET;
function requireRole(c: ApiContext, ...roles: Role[]) {
  if (!c.get("role") || !roles.includes(c.get("role")!))
    throw new HTTPException(403, {
      message: "This account role cannot perform that action",
    });
}
function rankedLimit(c: ApiContext, kind: string) {
  const { after, limit } = pagination.parse(c.req.query());
  if (after)
    throw new HTTPException(400, {
      message: `${kind} use a limit, not a cursor`,
    });
  return limit;
}

export function createApi(
  services: AnalysisServices = {
    analyzeDeveloper,
    analyzeOpportunity,
    analyzeRequest,
  },
) {
  const app = new Hono<ApiEnv>().basePath("/api");
  app.use("*", async (c, next) => {
    c.header("Cache-Control", "no-store");
    c.header("X-Content-Type-Options", "nosniff");
    if (!isConfigured(c.env))
      throw new HTTPException(503, { message: "Convex is not configured" });
    if (!["GET", "HEAD", "OPTIONS"].includes(c.req.method)) {
      const origin = c.req.header("Origin");
      if (origin && origin !== c.env.SITE_URL)
        throw new HTTPException(403, { message: "Untrusted origin" });
    }
    await next();
  });
  const jsonBodyLimit = bodyLimit({
    maxSize: 32 * 1024,
    onError: (c) => c.json({ error: "Request body exceeds 32 KB" }, 413),
  });
  app.use("*", (c, next) =>
    c.req.path === "/api/hiring/transcribe" ? next() : jsonBodyLimit(c, next),
  );
  app.on(["GET", "POST"], "/auth/*", (c) => proxyAuth(c.env, c.req.raw));
  // The map is public. Viewer-specific detail depends on the optional session.
  app.get("/map", async (c) =>
    c.json(
      await (
        await createOptionalClient(c.env, c.req.raw)
      ).query(convex.data.mapListings, { secret: secret(c) }),
    ),
  );
  app.use("*", async (c, next) => {
    const connection = await createAuthenticatedClient(c.env, c.req.raw);
    c.set("client", connection);
    const actor = await connection.query(convex.data.me, { secret: secret(c) });
    c.set("role", actor.role);
    await next();
  });
  app.get("/me", async (c) =>
    c.json(await client(c).query(convex.data.me, { secret: secret(c) })),
  );
  app.route("/hiring", createHiringRoutes());
  app.route("/developers/me", createCareerRoutes(services.analyzeCareerTarget));
  app.get("/project-drafts", async (c) =>
    c.json(
      await client(c).query(convex.data.projectDrafts, { secret: secret(c) }),
    ),
  );
  app.get("/project-drafts/:id", async (c) =>
    c.json(
      await client(c).query(convex.data.getProjectDraft, {
        secret: secret(c),
        id: c.req.param("id"),
      }),
    ),
  );
  app.post("/project-drafts", async (c) => {
    requireRole(c, "requester");
    const input = z
      .object({ id: z.uuid(), content: projectDraftContentSchema })
      .strict()
      .parse(await c.req.json());
    return c.json(
      await client(c).mutation(convex.data.saveProjectDraft, {
        secret: secret(c),
        ...input,
        expectedUpdatedAt: 0,
      }),
      201,
    );
  });
  app.put("/project-drafts/:id", async (c) => {
    requireRole(c, "requester");
    const input = z
      .object({
        content: projectDraftContentSchema,
        expectedUpdatedAt: z.number().int().nonnegative(),
      })
      .strict()
      .parse(await c.req.json());
    return c.json(
      await client(c).mutation(convex.data.saveProjectDraft, {
        secret: secret(c),
        id: c.req.param("id"),
        ...input,
      }),
    );
  });
  app.delete("/project-drafts/:id", async (c) => {
    const input = z
      .object({ expectedUpdatedAt: z.number().int().nonnegative() })
      .strict()
      .parse(await c.req.json());
    return c.json(
      await client(c).mutation(convex.data.discardProjectDraft, {
        secret: secret(c),
        id: c.req.param("id"),
        ...input,
      }),
    );
  });
  app.post("/project-drafts/:id/publish", async (c) => {
    requireRole(c, "requester");
    const input = z
      .object({ expectedUpdatedAt: z.number().int().nonnegative() })
      .strict()
      .parse(await c.req.json());
    const draft = await client(c).query(convex.data.getProjectDraft, {
      secret: secret(c),
      id: c.req.param("id"),
    });
    if (draft.publishedOpportunityId)
      return c.json(
        await client(c).query(convex.data.getOpportunity, {
          secret: secret(c),
          id: draft.publishedOpportunityId,
        }),
      );
    if (draft.updatedAt !== input.expectedUpdatedAt)
      throw new HTTPException(409, {
        message:
          "The saved draft changed. Reload and review it before publishing.",
      });
    const details = opportunityFromDraft(draft.content);
    const result = await services.analyzeOpportunity(c.env.AI, details);
    return c.json(
      await client(c).mutation(convex.data.createOpportunity, {
        secret: secret(c),
        id: `draft-${draft.id}`,
        details,
        ...result,
        draftId: draft.id,
        draftUpdatedAt: draft.updatedAt,
      }),
      201,
    );
  });
  app.put("/me/role", async (c) => {
    const input = z
      .object({
        role: z.enum(["developer", "requester"]),
      })
      .strict()
      .parse(await c.req.json());
    return c.json(
      await client(c).mutation(convex.data.setRole, {
        secret: secret(c),
        ...input,
      }),
    );
  });
  app.put("/developers/me", async (c) => {
    requireRole(c, "developer");
    const profile = developerSchema.parse(await c.req.json());
    const embedding = await services.analyzeDeveloper(c.env.AI, profile);
    return c.json(
      await client(c).mutation(convex.data.putDeveloper, {
        secret: secret(c),
        profile,
        embedding,
      }),
    );
  });
  app.get("/developers/me", async (c) =>
    c.json(
      await client(c).query(convex.data.ownProfile, { secret: secret(c) }),
    ),
  );
  app.patch("/developers/me", async (c) => {
    const input = z
      .object({
        available: z.boolean().optional(),
        discoverable: z.boolean().optional(),
      })
      .strict()
      .refine(
        (value) =>
          value.available !== undefined || value.discoverable !== undefined,
        "Choose availability or discovery visibility",
      )
      .parse(await c.req.json());
    return c.json(
      await client(c).mutation(convex.data.patchDeveloper, {
        secret: secret(c),
        ...input,
      }),
    );
  });
  app.patch("/developers/me/location", async (c) => {
    const location = developerLocationSchema.parse(await c.req.json());
    return c.json(
      await client(c).mutation(convex.data.setLocation, {
        secret: secret(c),
        location,
      }),
    );
  });
  app.patch("/developers/me/preferences", async (c) => {
    requireRole(c, "developer");
    const preferences = developerPreferencesSchema.parse(await c.req.json());
    return c.json(
      await client(c).mutation(convex.data.updateDeveloperPreferences, {
        secret: secret(c),
        preferences,
      }),
    );
  });
  app.get("/developers", async (c) =>
    c.json(
      await client(c).query(convex.data.developers, {
        secret: secret(c),
        ...pagination.parse(c.req.query()),
      }),
    ),
  );
  app.post("/opportunities", async (c) => {
    requireRole(c, "requester");
    const details = opportunitySchema.parse(await c.req.json());
    const result = await services.analyzeOpportunity(c.env.AI, details);
    return c.json(
      await client(c).mutation(convex.data.createOpportunity, {
        secret: secret(c),
        id: crypto.randomUUID(),
        details,
        ...result,
      }),
      201,
    );
  });
  app.get("/opportunities", async (c) => {
    const input = pagination
      .extend({
        city: z.string().trim().min(1).max(100).optional(),
        kind: z.enum(["paid", "volunteer"]).optional(),
      })
      .parse(c.req.query());
    return c.json(
      await client(c).query(convex.data.opportunities, {
        secret: secret(c),
        ...input,
      }),
    );
  });
  app.get("/opportunities/mine", async (c) =>
    c.json(
      await client(c).query(convex.data.ownedOpportunities, {
        secret: secret(c),
        ...pagination.parse(c.req.query()),
      }),
    ),
  );
  app.put("/opportunities/:id", async (c) => {
    requireRole(c, "requester");
    const details = opportunitySchema.parse(await c.req.json());
    const result = await services.analyzeOpportunity(c.env.AI, details);
    return c.json(
      await client(c).mutation(convex.data.reviseOpportunity, {
        secret: secret(c),
        id: c.req.param("id"),
        details,
        ...result,
      }),
    );
  });
  app.get("/opportunities/:id", async (c) =>
    c.json(
      await client(c).query(convex.data.getOpportunity, {
        secret: secret(c),
        id: c.req.param("id"),
      }),
    ),
  );
  app.patch("/opportunities/:id", async (c) => {
    const input = z
      .object({ status: z.enum(["open", "closed"]) })
      .strict()
      .parse(await c.req.json());
    return c.json(
      await client(c).mutation(convex.data.updateOpportunity, {
        secret: secret(c),
        id: c.req.param("id"),
        ...input,
      }),
    );
  });
  app.get("/opportunities/:id/matches", async (c) =>
    c.json(
      await client(c).query(convex.data.matches, {
        secret: secret(c),
        id: c.req.param("id"),
        limit: rankedLimit(c, "Matches"),
      }),
    ),
  );
  app.get("/opportunities/:id/match", async (c) =>
    c.json(
      await client(c).query(convex.data.ownMatch, {
        secret: secret(c),
        id: c.req.param("id"),
      }),
    ),
  );
  app.put("/opportunities/:id/interest", async (c) => {
    const input = z
      .object({
        developerId: z.string().max(100).optional(),
        interested: z.boolean(),
      })
      .strict()
      .parse(await c.req.json());
    return c.json(
      await client(c).mutation(convex.data.setInterest, {
        secret: secret(c),
        id: c.req.param("id"),
        ...input,
      }),
    );
  });
  app.on("GET", ["/connections", "/interests"], async (c) =>
    c.json(
      await client(c).query(convex.data.connections, {
        secret: secret(c),
        ...pagination.parse(c.req.query()),
        connectedOnly: c.req.path === "/api/connections",
      }),
    ),
  );
  app.get("/opportunities/:id/interests", async (c) =>
    c.json(
      await client(c).query(convex.data.connections, {
        secret: secret(c),
        ...pagination.parse(c.req.query()),
        connectedOnly: false,
        opportunityId: c.req.param("id"),
      }),
    ),
  );
  app.post("/requests", async (c) => {
    requireRole(c, "requester");
    const details = requestSchema.parse(await c.req.json());
    const result = await services.analyzeRequest(c.env.AI, details);
    return c.json(
      await client(c).mutation(convex.data.createRequest, {
        secret: secret(c),
        id: crypto.randomUUID(),
        details,
        ...result,
      }),
      201,
    );
  });
  app.get("/requests", async (c) =>
    c.json(
      await client(c).query(convex.data.ownedRequests, {
        secret: secret(c),
        ...pagination.parse(c.req.query()),
      }),
    ),
  );
  app.get("/requests/nearby", async (c) =>
    c.json(
      await client(c).query(convex.data.nearbyRequests, {
        secret: secret(c),
        limit: rankedLimit(c, "Nearby requests"),
      }),
    ),
  );
  app.get("/requests/claimed", async (c) =>
    c.json(
      await client(c).query(convex.data.claimedRequests, {
        secret: secret(c),
        ...pagination.parse(c.req.query()),
      }),
    ),
  );
  app.put("/requests/:id", async (c) => {
    requireRole(c, "requester");
    const details = requestSchema.parse(await c.req.json());
    const result = await services.analyzeRequest(c.env.AI, details);
    return c.json(
      await client(c).mutation(convex.data.reviseRequest, {
        secret: secret(c),
        id: c.req.param("id"),
        details,
        ...result,
      }),
    );
  });
  app.get("/requests/:id", async (c) =>
    c.json(
      await client(c).query(convex.data.getRequest, {
        secret: secret(c),
        id: c.req.param("id"),
      }),
    ),
  );
  app.get("/requests/:id/match", async (c) =>
    c.json(
      await client(c).query(convex.data.ownRequestMatch, {
        secret: secret(c),
        id: c.req.param("id"),
      }),
    ),
  );
  app.patch("/requests/:id", async (c) => {
    z.object({ status: z.literal("closed") })
      .strict()
      .parse(await c.req.json());
    return c.json(
      await client(c).mutation(convex.data.closeRequest, {
        secret: secret(c),
        id: c.req.param("id"),
      }),
    );
  });
  app.post("/requests/:id/accept", async (c) =>
    c.json(
      await client(c).mutation(convex.data.acceptRequest, {
        secret: secret(c),
        id: c.req.param("id"),
      }),
    ),
  );
  app.post("/requests/:id/release", async (c) =>
    c.json(
      await client(c).mutation(convex.data.releaseRequest, {
        secret: secret(c),
        id: c.req.param("id"),
      }),
    ),
  );
  app.notFound((c) => c.json({ error: "API route not found" }, 404));
  app.onError((error, c) => {
    if (error instanceof HiringProviderError)
      return c.json({ error: error.message }, error.status);
    if (error instanceof HTTPException)
      return c.json({ error: error.message }, error.status);
    if (error instanceof ConvexError) {
      const detail = z
        .object({
          status: z.union([
            z.literal(400),
            z.literal(401),
            z.literal(403),
            z.literal(404),
            z.literal(409),
            z.literal(503),
          ]),
          message: z.string(),
        })
        .safeParse(error.data);
      if (detail.success)
        return c.json({ error: detail.data.message }, detail.data.status);
    }
    if (error instanceof ZodError)
      return c.json(
        {
          error: "Check the request fields",
          issues: error.issues.map(({ path, message }) => ({ path, message })),
        },
        400,
      );
    if (error instanceof SyntaxError)
      return c.json({ error: "Send valid JSON" }, 400);
    if (error instanceof AnalysisUnavailable)
      return c.json({ error: error.message }, 503);
    console.error(JSON.stringify({ event: "api_error", method: c.req.method }));
    return c.json({ error: "Unable to complete the request" }, 500);
  });
  return app;
}

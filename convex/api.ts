import { ConvexError } from "convex/values";
import { z, ZodError } from "zod";
import { internal } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";
import { createAuth } from "./auth";
import { configuredProviders } from "./socialProviders";
import { fail } from "./access";
import { fireworksAI } from "./ai";
import { createHiringRoutes } from "./hiring/routes";
import { HiringProviderError } from "./hiring/providers";
import { HTTPException } from "hono/http-exception";
import { Hono } from "hono";
import type { ApiEnv as HiringApiEnv } from "./hiring/routes";
import {
  analyzeDeveloper,
  analyzeOpportunity,
  analyzeRequest,
  AnalysisUnavailable,
} from "../backend/ai";
import {
  developerSchema,
  developerLocationSchema,
  developerPreferencesSchema,
  opportunitySchema,
  requestSchema,
  type Role,
} from "../backend/schemas";
import { readRequestBody, RequestBodyTooLarge } from "../backend/http";
import { analyzeCareerTarget } from "../backend/career/analysis";
import { careerTargetInputSchema } from "../backend/career/schemas";
import {
  opportunityFromDraft,
  projectDraftContentSchema,
} from "../backend/project-drafts";

// Only tests inject analysis. The deployed HTTP router always uses the real provider.
export type AnalysisServices = {
  analyzeDeveloper: typeof analyzeDeveloper;
  analyzeOpportunity: typeof analyzeOpportunity;
  analyzeRequest: typeof analyzeRequest;
  analyzeCareerTarget?: typeof analyzeCareerTarget;
};
const productionServices: AnalysisServices = {
  analyzeDeveloper,
  analyzeOpportunity,
  analyzeRequest,
};
const pagination = z.object({
  after: z.string().max(100).default(""),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

function revision(request: Request) {
  const value = request.headers.get("If-Match");
  return value === null
    ? undefined
    : z.coerce
        .number()
        .int()
        .nonnegative()
        .parse(
          z
            .string()
            .regex(/^(?:\d+|"\d+")$/)
            .parse(value)
            .replace(/^"|"$/g, ""),
        );
}
async function body(request: Request) {
  return JSON.parse(
    new TextDecoder().decode(await readRequestBody(request)),
  ) as unknown;
}
const json = (value: unknown, status = 200) =>
  Response.json(value, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });

export async function handleApi(
  ctx: ActionCtx,
  request: Request,
  services = productionServices,
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const path = url.pathname.slice("/api".length).replace(/\/$/, "");
    const method = request.method;
    const origin = request.headers.get("Origin");
    const trusted = [
      process.env.SITE_URL,
      process.env.DEV_SITE_URL,
      process.env.CONVEX_SITE_URL,
    ].filter(Boolean);
    if (origin && !trusted.includes(origin)) fail(403, "Untrusted origin");
    if (
      !["GET", "HEAD", "OPTIONS"].includes(method) &&
      request.headers.has("cookie") &&
      !origin
    )
      fail(403, "An origin is required for cookie-authenticated changes");
    if (method === "OPTIONS")
      return new Response(null, {
        status: 204,
        headers: { "Cache-Control": "no-store" },
      });
    if (path === "/health" && method === "GET")
      return json({
        status: "ok",
        service: "buildandconnect",
        backend: "convex",
      });
    // Booleans only, so sign-in forms show the providers this deployment has
    // credentials for without the credentials ever leaving Convex.
    if (path === "/auth-providers" && method === "GET")
      return json(configuredProviders(process.env));
    const session = await createAuth(ctx).api.getSession({
      headers: request.headers,
    });
    const sessionId = session?.session.id;
    if (path === "/map" && method === "GET")
      return json(await ctx.runQuery(internal.data.mapListings, { sessionId }));
    const actor = await ctx.runQuery(internal.data.me, { sessionId });
    if (path.startsWith("/hiring/")) {
      const app = new Hono<HiringApiEnv>();
      app.use("*", async (c, next) => {
        c.set("role", actor.role);
        c.set("client", ctx);
        c.set("sessionId", sessionId);
        await next();
      });
      app.route("/api/hiring", createHiringRoutes());
      app.onError((error) => {
        throw error;
      });
      return await app.fetch(request, {
        FIREWORKS_API_KEY: process.env.FIREWORKS_API_KEY,
        FIREWORKS_MODEL: process.env.FIREWORKS_MODEL,
        ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
        ELEVENLABS_STT_MODEL: process.env.ELEVENLABS_STT_MODEL,
        ELEVENLABS_AGENT_ID: process.env.ELEVENLABS_AGENT_ID,
      });
    }
    const requireRole = (...roles: Role[]) => {
      if (!actor.role || !roles.includes(actor.role))
        fail(403, "This account role cannot perform that action");
    };
    const params = Object.fromEntries(url.searchParams);
    const page = () => pagination.parse(params);
    const limit = () => {
      const value = page();
      if (value.after) fail(400, "Ranked results use a limit, not a cursor");
      return value.limit;
    };
    const postingId = () => {
      const key = request.headers.get("Idempotency-Key");
      return key
        ? `${actor.user.id}:${z.uuid().parse(key).toLowerCase()}`
        : crypto.randomUUID();
    };
    const id = decodeURIComponent(path.split("/")[2] ?? "");

    if (path === "/developers/me/career-target") {
      requireRole("developer");
      const current = await ctx.runQuery(internal.data.ownCareerTarget, {
        sessionId,
      });
      if (method === "GET") return json(current);
      if (method === "PUT") {
        const { expectedUpdatedAt, ...input } = careerTargetInputSchema
          .extend({
            expectedUpdatedAt: z.number().int().nonnegative().optional(),
          })
          .parse(await body(request));
        if (
          expectedUpdatedAt !== undefined &&
          expectedUpdatedAt !== (current?.updatedAt ?? 0)
        )
          fail(
            409,
            "Your career target changed. Reload it before saving again.",
          );
        const target = await (
          services.analyzeCareerTarget ?? analyzeCareerTarget
        )(fireworksAI(), input);
        return json(
          await ctx.runMutation(internal.data.putCareerTarget, {
            sessionId,
            target,
            expectedUpdatedAt: expectedUpdatedAt ?? current?.updatedAt ?? 0,
          }),
        );
      }
    }
    if (path === "/developers/me/career-projects" && method === "GET") {
      requireRole("developer");
      const input = z
        .object({ limit: z.coerce.number().int().min(1).max(100).default(20) })
        .strict()
        .parse(params);
      return json(
        await ctx.runQuery(internal.data.careerRecommendations, {
          sessionId,
          ...input,
        }),
      );
    }
    if (path === "/project-drafts") {
      requireRole("requester");
      if (method === "GET")
        return json(
          await ctx.runQuery(internal.data.projectDrafts, { sessionId }),
        );
      if (method === "POST") {
        const input = z
          .object({ id: z.uuid(), content: projectDraftContentSchema })
          .strict()
          .parse(await body(request));
        return json(
          await ctx.runMutation(internal.data.saveProjectDraft, {
            sessionId,
            ...input,
            expectedUpdatedAt: 0,
          }),
          201,
        );
      }
    }
    if (/^\/project-drafts\/[^/]+$/.test(path)) {
      requireRole("requester");
      if (method === "GET")
        return json(
          await ctx.runQuery(internal.data.getProjectDraft, { sessionId, id }),
        );
      if (method === "PUT") {
        const input = z
          .object({
            content: projectDraftContentSchema,
            expectedUpdatedAt: z.number().int().nonnegative(),
          })
          .strict()
          .parse(await body(request));
        return json(
          await ctx.runMutation(internal.data.saveProjectDraft, {
            sessionId,
            id,
            ...input,
          }),
        );
      }
      if (method === "DELETE") {
        const input = z
          .object({ expectedUpdatedAt: z.number().int().nonnegative() })
          .strict()
          .parse(await body(request));
        return json(
          await ctx.runMutation(internal.data.discardProjectDraft, {
            sessionId,
            id,
            ...input,
          }),
        );
      }
    }
    if (/^\/project-drafts\/[^/]+\/publish$/.test(path) && method === "POST") {
      requireRole("requester");
      const input = z
        .object({ expectedUpdatedAt: z.number().int().nonnegative() })
        .strict()
        .parse(await body(request));
      const draft = await ctx.runQuery(internal.data.getProjectDraft, {
        sessionId,
        id,
      });
      if (draft.publishedOpportunityId)
        return json(
          await ctx.runQuery(internal.data.getOpportunity, {
            sessionId,
            id: draft.publishedOpportunityId,
          }),
        );
      if (draft.updatedAt !== input.expectedUpdatedAt)
        fail(
          409,
          "The saved draft changed. Reload and review it before publishing.",
        );
      const details = opportunityFromDraft(draft.content);
      const result = await services.analyzeOpportunity(fireworksAI(), details);
      return json(
        await ctx.runMutation(internal.data.createOpportunity, {
          sessionId,
          id: `draft-${draft.id}`,
          details,
          ...result,
          draftId: draft.id,
          draftUpdatedAt: draft.updatedAt,
        }),
        201,
      );
    }

    switch (`${method} ${path}`) {
      case "GET /me":
        return json(actor);
      case "PUT /me/role": {
        const input = z
          .object({
            role: z.enum(["developer", "requester"]),
          })
          .strict()
          .parse(await body(request));
        return json(
          await ctx.runMutation(internal.data.setRole, { sessionId, ...input }),
        );
      }
      case "GET /developers/me":
        return json(
          await ctx.runQuery(internal.data.ownProfile, { sessionId }),
        );
      case "PUT /developers/me": {
        requireRole("developer");
        const expectedRevision = revision(request);
        const profile = developerSchema.parse(await body(request));
        const embedding = await services.analyzeDeveloper(
          fireworksAI(),
          profile,
        );
        return json(
          await ctx.runMutation(internal.data.putDeveloper, {
            sessionId,
            profile,
            embedding,
            expectedRevision,
          }),
        );
      }
      case "PATCH /developers/me": {
        const input = z
          .object({
            available: z.boolean().optional(),
            discoverable: z.boolean().optional(),
          })
          .strict()
          .refine(
            (v) => v.available !== undefined || v.discoverable !== undefined,
            "Choose availability or discovery visibility",
          )
          .parse(await body(request));
        return json(
          await ctx.runMutation(internal.data.patchDeveloper, {
            sessionId,
            ...input,
          }),
        );
      }
      case "PATCH /developers/me/location":
        return json(
          await ctx.runMutation(internal.data.setLocation, {
            sessionId,
            location: developerLocationSchema.parse(await body(request)),
          }),
        );
      case "PATCH /developers/me/preferences": {
        requireRole("developer");
        return json(
          await ctx.runMutation(internal.data.updateDeveloperPreferences, {
            sessionId,
            preferences: developerPreferencesSchema.parse(await body(request)),
          }),
        );
      }
      case "GET /developers":
        return json(
          await ctx.runQuery(internal.data.developers, {
            sessionId,
            ...page(),
          }),
        );
      case "GET /opportunities":
        return json(
          await ctx.runQuery(internal.data.opportunities, {
            sessionId,
            ...pagination
              .extend({
                city: z.string().trim().min(1).max(100).optional(),
                kind: z.enum(["paid", "volunteer"]).optional(),
              })
              .parse(params),
          }),
        );
      case "GET /opportunities/mine":
        return json(
          await ctx.runQuery(internal.data.ownedOpportunities, {
            sessionId,
            ...page(),
          }),
        );
      case "POST /opportunities": {
        requireRole("requester");
        const id = postingId();
        const details = opportunitySchema.parse(await body(request));
        const result = await services.analyzeOpportunity(
          fireworksAI(),
          details,
        );
        return json(
          await ctx.runMutation(internal.data.createOpportunity, {
            sessionId,
            id,
            details,
            ...result,
          }),
          201,
        );
      }
      case "GET /connections":
      case "GET /interests":
        return json(
          await ctx.runQuery(internal.data.connections, {
            sessionId,
            ...page(),
            connectedOnly: path === "/connections",
            opportunityId: params.opportunityId,
          }),
        );
      case "GET /requests":
        return json(
          await ctx.runQuery(internal.data.ownedRequests, {
            sessionId,
            ...page(),
          }),
        );
      case "GET /requests/nearby":
        return json(
          await ctx.runQuery(internal.data.nearbyRequests, {
            sessionId,
            limit: limit(),
          }),
        );
      case "GET /requests/claimed":
        return json(
          await ctx.runQuery(internal.data.claimedRequests, {
            sessionId,
            ...page(),
          }),
        );
      case "POST /requests": {
        requireRole("requester");
        const id = postingId();
        const details = requestSchema.parse(await body(request));
        const result = await services.analyzeRequest(fireworksAI(), details);
        return json(
          await ctx.runMutation(internal.data.createRequest, {
            sessionId,
            id,
            details,
            ...result,
          }),
          201,
        );
      }
    }
    if (/^\/developers\/[^/]+$/.test(path) && method === "GET")
      return json(
        await ctx.runQuery(internal.data.getDeveloper, { sessionId, id }),
      );
    if (/^\/opportunities\/[^/]+$/.test(path)) {
      if (method === "GET")
        return json(
          await ctx.runQuery(internal.data.getOpportunity, { sessionId, id }),
        );
      if (method === "PUT") {
        requireRole("requester");
        const existing = await ctx.runQuery(internal.data.getOpportunity, {
          sessionId,
          id,
        });
        if (existing.ownerId !== actor.user.id)
          fail(403, "Only the opportunity owner can edit it");
        const expectedRevision = revision(request);
        const details = opportunitySchema.parse(await body(request));
        const result = await services.analyzeOpportunity(
          fireworksAI(),
          details,
        );
        return json(
          await ctx.runMutation(internal.data.reviseOpportunity, {
            sessionId,
            id,
            details,
            expectedRevision,
            ...result,
          }),
        );
      }
      if (method === "PATCH") {
        const input = z
          .object({ status: z.enum(["open", "closed"]) })
          .strict()
          .parse(await body(request));
        return json(
          await ctx.runMutation(internal.data.updateOpportunity, {
            sessionId,
            id,
            ...input,
          }),
        );
      }
    }
    if (/^\/opportunities\/[^/]+\/matches$/.test(path) && method === "GET")
      return json(
        await ctx.runQuery(internal.data.matches, {
          sessionId,
          id,
          limit: limit(),
        }),
      );
    if (/^\/opportunities\/[^/]+\/match$/.test(path) && method === "GET")
      return json(
        await ctx.runQuery(internal.data.ownMatch, { sessionId, id }),
      );
    if (/^\/opportunities\/[^/]+\/interest$/.test(path) && method === "PUT") {
      const input = z
        .object({
          developerId: z.string().max(100).optional(),
          interested: z.boolean(),
        })
        .strict()
        .parse(await body(request));
      return json(
        await ctx.runMutation(internal.data.setInterest, {
          sessionId,
          id,
          ...input,
        }),
      );
    }
    if (/^\/opportunities\/[^/]+\/interests$/.test(path) && method === "GET")
      return json(
        await ctx.runQuery(internal.data.connections, {
          sessionId,
          ...page(),
          connectedOnly: false,
          opportunityId: id,
        }),
      );
    if (/^\/requests\/[^/]+\/match$/.test(path) && method === "GET")
      return json(
        await ctx.runQuery(internal.data.ownRequestMatch, { sessionId, id }),
      );
    if (/^\/requests\/[^/]+$/.test(path)) {
      if (method === "GET")
        return json(
          await ctx.runQuery(internal.data.getRequest, { sessionId, id }),
        );
      if (method === "PUT") {
        requireRole("requester");
        const existing = await ctx.runQuery(internal.data.getRequest, {
          sessionId,
          id,
        });
        if (existing.ownerId !== actor.user.id)
          fail(403, "Only the requester can edit this request");
        if (existing.status !== "open")
          fail(409, "Only open requests can be edited");
        const expectedRevision = revision(request);
        const details = requestSchema.parse(await body(request));
        const result = await services.analyzeRequest(fireworksAI(), details);
        return json(
          await ctx.runMutation(internal.data.reviseRequest, {
            sessionId,
            id,
            details,
            expectedRevision,
            ...result,
          }),
        );
      }
      if (method === "PATCH") {
        z.object({ status: z.literal("closed") })
          .strict()
          .parse(await body(request));
        return json(
          await ctx.runMutation(internal.data.closeRequest, { sessionId, id }),
        );
      }
    }
    if (/^\/requests\/[^/]+\/accept$/.test(path) && method === "POST")
      return json(
        await ctx.runMutation(internal.data.acceptRequest, { sessionId, id }),
      );
    if (/^\/requests\/[^/]+\/release$/.test(path) && method === "POST")
      return json(
        await ctx.runMutation(internal.data.releaseRequest, { sessionId, id }),
      );
    return json({ error: "API route not found" }, 404);
  } catch (error) {
    if (error instanceof HTTPException || error instanceof HiringProviderError)
      return json({ error: error.message }, error.status);
    if (error instanceof RequestBodyTooLarge)
      return json({ error: "Request body exceeds 32 KB" }, 413);
    if (error instanceof ConvexError) {
      const detail = z
        .object({
          status: z.number().int().min(400).max(599),
          message: z.string(),
        })
        .safeParse(error.data);
      if (detail.success)
        return json({ error: detail.data.message }, detail.data.status);
    }
    if (error instanceof ZodError)
      return json(
        {
          error: "Check the request fields",
          issues: error.issues.map(({ path, message }) => ({ path, message })),
        },
        400,
      );
    if (error instanceof SyntaxError || error instanceof URIError)
      return json({ error: "Send valid JSON and URL parameters" }, 400);
    if (error instanceof AnalysisUnavailable)
      return json({ error: error.message }, 503);
    console.error(
      JSON.stringify({ event: "api_error", method: request.method }),
    );
    return json({ error: "Unable to complete the request" }, 500);
  }
}

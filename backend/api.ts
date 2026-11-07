import { Hono, type Context } from "hono";
import { bodyLimit } from "hono/body-limit";
import { HTTPException } from "hono/http-exception";
import { z, ZodError } from "zod";
import { createAuth } from "./auth.ts";
import {
  analyzeDeveloper,
  analyzeOpportunity,
  analyzeRequest,
  AnalysisUnavailable,
  ANALYSIS_MODEL,
  ANALYSIS_VERSION,
  EMBEDDING_MODEL,
} from "./ai.ts";
import type { BackendEnv } from "./env.ts";
import {
  eligibility,
  rankDevelopers,
  rankNearbyRequests,
  WEIGHTS,
  MATCH_VERSION,
} from "./matching.ts";
import {
  developerLocationSchema,
  developerSchema,
  opportunitySchema,
  requestSchema,
  type Role,
  type Opportunity,
} from "./schemas.ts";
import {
  getDeveloper,
  getOpportunity,
  getRequest,
  listCandidates,
  listDevelopers,
  listNearbyRequestCandidates,
  listOpportunities,
  listOwnedRequests,
  ownDeveloper,
  publicDeveloper,
  publicOpportunity,
  publicRequest,
} from "./store.ts";

type ApiEnv = {
  Bindings: BackendEnv;
  Variables: { user: { id: string; name: string }; role: Role | null };
};
type ApiContext = Context<ApiEnv>;
type AnalysisServices = {
  analyzeDeveloper: typeof analyzeDeveloper;
  analyzeOpportunity: typeof analyzeOpportunity;
  analyzeRequest: typeof analyzeRequest;
};

function requireRole(c: ApiContext, ...roles: Role[]) {
  if (!c.get("role") || !roles.includes(c.get("role")!))
    throw new HTTPException(403, {
      message: "This account role cannot perform that action",
    });
}
async function ownedOpportunity(c: ApiContext): Promise<Opportunity> {
  const opportunity = await getOpportunity(c.env.DB, c.req.param("id")!);
  if (!opportunity)
    throw new HTTPException(404, { message: "Opportunity not found" });
  if (opportunity.ownerId !== c.get("user").id)
    throw new HTTPException(403, {
      message: "Only the opportunity owner can access this",
    });
  return opportunity;
}
const pagination = z.object({
  after: z.string().max(100).default(""),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
function page<T extends { id: string }>(items: T[], limit: number) {
  const data = items.slice(0, limit);
  return { data, nextCursor: items.length > limit ? data.at(-1)!.id : null };
}

export function createApi(
  services: AnalysisServices = {
    analyzeDeveloper,
    analyzeOpportunity,
    analyzeRequest,
  },
) {
  const api = new Hono<ApiEnv>().basePath("/api");
  api.use("*", async (c, next) => {
    c.header("Cache-Control", "no-store");
    c.header("X-Content-Type-Options", "nosniff");
    if (
      !c.env.BETTER_AUTH_SECRET ||
      c.env.BETTER_AUTH_SECRET.length < 32 ||
      !c.env.SITE_URL
    )
      throw new HTTPException(503, {
        message: "Authentication is not configured",
      });
    if (!["GET", "HEAD", "OPTIONS"].includes(c.req.method)) {
      const origin = c.req.header("Origin");
      if (origin && origin !== c.env.SITE_URL)
        throw new HTTPException(403, { message: "Untrusted origin" });
    }
    await next();
  });
  api.use(
    "*",
    bodyLimit({
      maxSize: 32 * 1024,
      onError: (c) => c.json({ error: "Request body exceeds 32 KB" }, 413),
    }),
  );
  api.on(["GET", "POST"], "/auth/*", (c) =>
    createAuth(c.env).handler(c.req.raw),
  );
  api.use("*", async (c, next) => {
    const session = await createAuth(c.env).api.getSession({
      headers: c.req.raw.headers,
    });
    if (!session)
      throw new HTTPException(401, { message: "Sign in to continue" });
    c.set("user", { id: session.user.id, name: session.user.name });
    const member = await c.env.DB.prepare(
      "SELECT role FROM member WHERE user_id = ?",
    )
      .bind(session.user.id)
      .first<{ role: Role }>();
    c.set("role", member?.role ?? null);
    await next();
  });

  api.get("/me", (c) => c.json({ user: c.get("user"), role: c.get("role") }));
  api.put("/me/role", async (c) => {
    const { role } = z
      .object({
        role: z.enum(["developer", "company", "recruiter", "requester"]),
      })
      .strict()
      .parse(await c.req.json());
    await c.env.DB.prepare(
      "INSERT INTO member (user_id, role) VALUES (?, ?) ON CONFLICT(user_id) DO NOTHING",
    )
      .bind(c.get("user").id, role)
      .run();
    const saved = await c.env.DB.prepare(
      "SELECT role FROM member WHERE user_id = ?",
    )
      .bind(c.get("user").id)
      .first<{ role: Role }>();
    if (saved?.role !== role)
      throw new HTTPException(409, { message: "Account role is already set" });
    return c.json({ role });
  });

  api.put("/developers/me", async (c) => {
    requireRole(c, "developer");
    const profile = developerSchema.parse(await c.req.json());
    const embedding = await services.analyzeDeveloper(c.env.AI, profile);
    await c.env.DB.prepare(
      `INSERT INTO developer (user_id, profile, embedding, embedding_model, updated_at) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET profile = excluded.profile, embedding = excluded.embedding, embedding_model = excluded.embedding_model, updated_at = excluded.updated_at`,
    )
      .bind(
        c.get("user").id,
        JSON.stringify(profile),
        JSON.stringify(embedding),
        EMBEDDING_MODEL,
        Date.now(),
      )
      .run();
    return c.json({ id: c.get("user").id, ...profile });
  });
  api.get("/developers/me", async (c) => {
    requireRole(c, "developer");
    const developer = await getDeveloper(c.env.DB, c.get("user").id);
    if (!developer)
      throw new HTTPException(404, {
        message: "Create a developer profile first",
      });
    return c.json(ownDeveloper(developer));
  });
  api.patch("/developers/me", async (c) => {
    requireRole(c, "developer");
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
    // Revoking discovery must not depend on model availability.
    const result = await c.env.DB.prepare(
      "UPDATE developer SET profile = json_patch(profile, ?), updated_at = ? WHERE user_id = ?",
    )
      .bind(JSON.stringify(input), Date.now(), c.get("user").id)
      .run();
    if (!result.meta.changes)
      throw new HTTPException(404, {
        message: "Create a developer profile first",
      });
    return c.json({ id: c.get("user").id, ...input });
  });
  api.patch("/developers/me/location", async (c) => {
    requireRole(c, "developer");
    const location = developerLocationSchema.parse(await c.req.json());
    const result = await c.env.DB.prepare(
      "UPDATE developer SET latitude = ?, longitude = ?, radius_km = ?, updated_at = ? WHERE user_id = ?",
    )
      .bind(
        location.latitude,
        location.longitude,
        location.radiusKm,
        Date.now(),
        c.get("user").id,
      )
      .run();
    if (!result.meta.changes)
      throw new HTTPException(404, {
        message: "Create a developer profile first",
      });
    return c.json({ id: c.get("user").id, location });
  });
  api.get("/developers", async (c) => {
    requireRole(c, "company", "recruiter");
    const { after, limit } = pagination.parse(c.req.query());
    return c.json(
      page(
        (await listDevelopers(c.env.DB, after, limit)).map(publicDeveloper),
        limit,
      ),
    );
  });

  api.post("/opportunities", async (c) => {
    requireRole(c, "company");
    const input = opportunitySchema.parse(await c.req.json());
    const { analysis, embedding } = await services.analyzeOpportunity(
      c.env.AI,
      input,
    );
    const id = crypto.randomUUID();
    await c.env.DB.prepare(
      `INSERT INTO opportunity (id, owner_id, details, analysis, embedding, analysis_model, analysis_version, embedding_model, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        id,
        c.get("user").id,
        JSON.stringify(input),
        JSON.stringify(analysis),
        JSON.stringify(embedding),
        ANALYSIS_MODEL,
        ANALYSIS_VERSION,
        EMBEDDING_MODEL,
        Date.now(),
      )
      .run();
    return c.json({ id, ...input, analysis, status: "open" }, 201);
  });
  api.get("/opportunities", async (c) => {
    const { after, limit, city, kind } = pagination
      .extend({
        city: z.string().trim().min(1).max(100).optional(),
        kind: z.enum(["paid", "volunteer"]).optional(),
      })
      .parse(c.req.query());
    return c.json(
      page(
        (await listOpportunities(c.env.DB, after, limit, city, kind)).map(
          publicOpportunity,
        ),
        limit,
      ),
    );
  });
  api.get("/opportunities/:id", async (c) => {
    const opportunity = await getOpportunity(c.env.DB, c.req.param("id"));
    if (!opportunity)
      throw new HTTPException(404, { message: "Opportunity not found" });
    return c.json(publicOpportunity(opportunity));
  });
  api.patch("/opportunities/:id", async (c) => {
    requireRole(c, "company");
    const opportunity = await ownedOpportunity(c);
    const { status } = z
      .object({ status: z.enum(["open", "closed"]) })
      .strict()
      .parse(await c.req.json());
    await c.env.DB.prepare("UPDATE opportunity SET status = ? WHERE id = ?")
      .bind(status, opportunity.id)
      .run();
    return c.json({ id: opportunity.id, status });
  });
  api.get("/opportunities/:id/matches", async (c) => {
    requireRole(c, "company");
    const opportunity = await ownedOpportunity(c);
    const { after, limit } = pagination.parse(c.req.query());
    if (after)
      throw new HTTPException(400, {
        message: "Matches use a limit, not a cursor",
      });
    const candidates = await listCandidates(c.env.DB, opportunity);
    if (candidates.length > 1000)
      throw new HTTPException(503, {
        message:
          "Candidate pool exceeds the MVP limit; narrow opportunity constraints",
      });
    const ranked = rankDevelopers(opportunity, candidates);
    return c.json({
      data: ranked.slice(0, limit),
      total: ranked.length,
      version: MATCH_VERSION,
      weights: WEIGHTS,
    });
  });
  api.get("/opportunities/:id/match", async (c) => {
    requireRole(c, "developer");
    const opportunity = await getOpportunity(c.env.DB, c.req.param("id"));
    const developer = await getDeveloper(c.env.DB, c.get("user").id);
    if (!opportunity || !developer)
      throw new HTTPException(404, {
        message: "Opportunity or profile not found",
      });
    return c.json({
      data: rankDevelopers(opportunity, [developer])[0] ?? null,
      ineligibleReasons: eligibility(opportunity, developer),
      status: opportunity.status,
      version: MATCH_VERSION,
      weights: WEIGHTS,
    });
  });

  api.put("/opportunities/:id/interest", async (c) => {
    requireRole(c, "company", "developer");
    const input = z
      .object({
        developerId: z.string().max(100).optional(),
        interested: z.boolean(),
      })
      .strict()
      .parse(await c.req.json());
    const opportunity = await getOpportunity(c.env.DB, c.req.param("id"));
    if (!opportunity)
      throw new HTTPException(404, { message: "Opportunity not found" });
    const company = c.get("role") === "company";
    if (company && opportunity.ownerId !== c.get("user").id)
      throw new HTTPException(403, {
        message: "Only the opportunity owner can express company interest",
      });
    if (!company && input.developerId && input.developerId !== c.get("user").id)
      throw new HTTPException(403, {
        message: "You can only express interest for yourself",
      });
    const developerId = company ? input.developerId : c.get("user").id;
    if (!developerId)
      throw new HTTPException(400, { message: "Choose a developer" });
    const developer = await getDeveloper(c.env.DB, developerId);
    if (!developer)
      throw new HTTPException(404, { message: "Developer not found" });
    if (
      input.interested &&
      (opportunity.status !== "open" ||
        eligibility(opportunity, developer).length)
    )
      throw new HTTPException(409, {
        message: "An open opportunity and eligible developer are required",
      });
    const side = company ? "company_interested" : "developer_interested";
    const now = Date.now();
    await c.env.DB.prepare(
      `INSERT INTO interest (opportunity_id, developer_id, ${side}, first_company_interest_at, updated_at) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(opportunity_id, developer_id) DO UPDATE SET ${side} = excluded.${side}, first_company_interest_at = coalesce(interest.first_company_interest_at, excluded.first_company_interest_at), updated_at = excluded.updated_at`,
    )
      .bind(
        opportunity.id,
        developerId,
        input.interested ? 1 : 0,
        company && input.interested ? now : null,
        now,
      )
      .run();
    const interest = await c.env.DB.prepare(
      "SELECT company_interested, developer_interested FROM interest WHERE opportunity_id = ? AND developer_id = ?",
    )
      .bind(opportunity.id, developerId)
      .first<{ company_interested: number; developer_interested: number }>();
    return c.json({
      opportunityId: opportunity.id,
      developerId,
      companyInterested: !!interest?.company_interested,
      developerInterested: !!interest?.developer_interested,
      connected:
        !!interest?.company_interested && !!interest?.developer_interested,
    });
  });
  api.on("GET", ["/connections", "/interests"], async (c) => {
    requireRole(c, "company", "developer");
    const { after, limit } = pagination.parse(c.req.query());
    const company = c.get("role") === "company";
    const connectionsOnly = c.req.path === "/api/connections";
    const result = await c.env.DB.prepare(
      `SELECT i.opportunity_id, i.developer_id, i.company_interested, i.developer_interested, o.details, u.name AS developer_name, owner.name AS company_name
      FROM interest i JOIN opportunity o ON o.id = i.opportunity_id JOIN user u ON u.id = i.developer_id JOIN user owner ON owner.id = o.owner_id
      WHERE ${connectionsOnly ? "i.company_interested = 1 AND i.developer_interested = 1" : "(i.company_interested = 1 OR i.developer_interested = 1)"} AND ${company ? "o.owner_id" : "i.developer_id"} = ?
      AND (i.opportunity_id || ':' || i.developer_id) > ? ORDER BY i.opportunity_id, i.developer_id LIMIT ?`,
    )
      .bind(c.get("user").id, after, limit + 1)
      .all<{
        opportunity_id: string;
        developer_id: string;
        details: string;
        developer_name: string;
        company_name: string;
        company_interested: number;
        developer_interested: number;
      }>();
    return c.json(
      page(
        result.results.map((row) => ({
          id: `${row.opportunity_id}:${row.developer_id}`,
          opportunityId: row.opportunity_id,
          developerId: row.developer_id,
          title: opportunitySchema.parse(JSON.parse(row.details)).title,
          developerName: row.developer_name,
          companyName: row.company_name,
          companyInterested: !!row.company_interested,
          developerInterested: !!row.developer_interested,
          connected: !!row.company_interested && !!row.developer_interested,
        })),
        limit,
      ),
    );
  });

  api.post("/requests", async (c) => {
    requireRole(c, "requester");
    const input = requestSchema.parse(await c.req.json());
    const { analysis, embedding } = await services.analyzeRequest(
      c.env.AI,
      input,
    );
    const id = crypto.randomUUID();
    await c.env.DB.prepare(
      `INSERT INTO request (
        id, owner_id, title, description, place, latitude, longitude,
        analysis, embedding, analysis_model, analysis_version, embedding_model,
        status, claimed_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', NULL, ?)`,
    )
      .bind(
        id,
        c.get("user").id,
        input.title,
        input.description,
        input.place,
        input.latitude,
        input.longitude,
        JSON.stringify(analysis),
        JSON.stringify(embedding),
        ANALYSIS_MODEL,
        ANALYSIS_VERSION,
        EMBEDDING_MODEL,
        Date.now(),
      )
      .run();
    return c.json(
      {
        id,
        ...input,
        analysis,
        status: "open",
        claimedBy: null,
        claimantName: null,
        ownerId: c.get("user").id,
        ownerName: c.get("user").name,
      },
      201,
    );
  });
  api.get("/requests", async (c) => {
    requireRole(c, "requester");
    const { after, limit } = pagination.parse(c.req.query());
    return c.json(
      page(
        (await listOwnedRequests(c.env.DB, c.get("user").id, after, limit)).map(
          publicRequest,
        ),
        limit,
      ),
    );
  });
  api.get("/requests/nearby", async (c) => {
    requireRole(c, "developer");
    const { after, limit } = pagination.parse(c.req.query());
    if (after)
      throw new HTTPException(400, {
        message: "Nearby requests use a limit, not a cursor",
      });
    const developer = await getDeveloper(c.env.DB, c.get("user").id);
    if (!developer)
      throw new HTTPException(404, {
        message: "Create a developer profile first",
      });
    if (!developer.location)
      throw new HTTPException(400, {
        message: "Set a map pin and radius before browsing nearby requests",
      });
    const candidates = await listNearbyRequestCandidates(
      c.env.DB,
      developer.location,
    );
    if (candidates.length > 1000)
      throw new HTTPException(503, {
        message:
          "Nearby request pool exceeds the MVP limit; shrink your radius",
      });
    const ranked = rankNearbyRequests(candidates, developer);
    return c.json({
      data: ranked.slice(0, limit),
      total: ranked.length,
      version: MATCH_VERSION,
      weights: WEIGHTS,
      location: developer.location,
    });
  });
  api.get("/requests/:id", async (c) => {
    const request = await getRequest(c.env.DB, c.req.param("id"));
    if (!request)
      throw new HTTPException(404, { message: "Request not found" });
    const role = c.get("role");
    const userId = c.get("user").id;
    const allowed =
      (role === "requester" && request.ownerId === userId) ||
      (role === "developer" &&
        (request.status === "open" || request.claimedBy === userId));
    if (!allowed)
      throw new HTTPException(403, {
        message: "Only the requester or an eligible developer can view this",
      });
    return c.json(publicRequest(request));
  });
  api.patch("/requests/:id", async (c) => {
    requireRole(c, "requester");
    const request = await getRequest(c.env.DB, c.req.param("id"));
    if (!request)
      throw new HTTPException(404, { message: "Request not found" });
    if (request.ownerId !== c.get("user").id)
      throw new HTTPException(403, {
        message: "Only the requester can close this",
      });
    const { status } = z
      .object({ status: z.literal("closed") })
      .strict()
      .parse(await c.req.json());
    await c.env.DB.prepare(
      "UPDATE request SET status = ?, claimed_by = NULL WHERE id = ?",
    )
      .bind(status, request.id)
      .run();
    return c.json({ id: request.id, status, claimedBy: null });
  });
  api.post("/requests/:id/accept", async (c) => {
    requireRole(c, "developer");
    const developer = await getDeveloper(c.env.DB, c.get("user").id);
    if (!developer)
      throw new HTTPException(404, {
        message: "Create a developer profile first",
      });
    if (!developer.location)
      throw new HTTPException(400, {
        message: "Set a map pin and radius before accepting requests",
      });
    const request = await getRequest(c.env.DB, c.req.param("id"));
    if (!request)
      throw new HTTPException(404, { message: "Request not found" });
    const match = rankNearbyRequests([request], developer)[0];
    if (!match && request.status === "open")
      throw new HTTPException(409, {
        message: "This request is outside your radius or eligibility",
      });
    if (request.status === "claimed" && request.claimedBy === c.get("user").id)
      return c.json(publicRequest(request));
    if (request.status !== "open")
      throw new HTTPException(409, {
        message: "Only an open request can be accepted",
      });
    const result = await c.env.DB.prepare(
      "UPDATE request SET status = 'claimed', claimed_by = ? WHERE id = ? AND status = 'open'",
    )
      .bind(c.get("user").id, request.id)
      .run();
    if (!result.meta.changes)
      throw new HTTPException(409, {
        message: "Another developer already accepted this request",
      });
    const claimed = await getRequest(c.env.DB, request.id);
    return c.json(publicRequest(claimed!));
  });
  api.post("/requests/:id/release", async (c) => {
    requireRole(c, "developer", "requester");
    const request = await getRequest(c.env.DB, c.req.param("id"));
    if (!request)
      throw new HTTPException(404, { message: "Request not found" });
    const userId = c.get("user").id;
    const role = c.get("role");
    const allowed =
      (role === "developer" && request.claimedBy === userId) ||
      (role === "requester" && request.ownerId === userId);
    if (!allowed)
      throw new HTTPException(403, {
        message: "Only the claimant or requester can release this",
      });
    if (request.status !== "claimed")
      throw new HTTPException(409, {
        message: "Only a claimed request can be released",
      });
    await c.env.DB.prepare(
      "UPDATE request SET status = 'open', claimed_by = NULL WHERE id = ? AND status = 'claimed'",
    )
      .bind(request.id)
      .run();
    const released = await getRequest(c.env.DB, request.id);
    return c.json(publicRequest(released!));
  });

  api.notFound((c) => c.json({ error: "API route not found" }, 404));
  api.onError((error, c) => {
    if (error instanceof HTTPException)
      return c.json({ error: error.message }, error.status);
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
  return api;
}

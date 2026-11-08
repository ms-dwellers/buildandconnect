import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { access, fail, optionalAccess } from "./access";
import {
  developerData,
  findDeveloper,
  findOpportunity,
  findRequest,
  opportunityData,
  requestData,
  page,
  publicDeveloper,
  ownDeveloper,
  publicOpportunity,
  publicRequest,
} from "./domain";
import {
  role,
  profile,
  opportunity,
  request,
  location,
  analysis,
  developerPreferences,
} from "./schema";
import {
  developerSchema,
  opportunitySchema,
  requestSchema,
  developerLocationSchema,
  analysisSchema,
  vectorSchema,
  developerPreferencesSchema,
} from "../backend/schemas";
import {
  boundingBox,
  eligibility,
  rankDevelopers,
  rankNearbyRequests,
  WEIGHTS,
  MATCH_VERSION,
} from "../backend/matching";
import {
  ANALYSIS_MODEL,
  ANALYSIS_VERSION,
  EMBEDDING_MODEL,
} from "../backend/models";
import { opportunityListing, requestListing } from "../backend/listings";
import { CALGARY_BOUNDS, type CityJob } from "../lib/calgary-area";

const secret = v.string();
const pagination = { after: v.string(), limit: v.number() };
function checkLimit(limit: number) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100)
    fail(400, "Limit must be between 1 and 100");
}

export const me = query({
  args: { secret },
  handler: async (ctx, args) => access(ctx, args.secret),
});

export const setRole = mutation({
  args: { secret, role },
  handler: async (ctx, args) => {
    const actor = await access(ctx, args.secret);
    if (actor.role && actor.role !== args.role)
      fail(409, "Account role is already set");
    if (!actor.role)
      await ctx.db.insert("members", {
        userId: actor.user.id,
        name: actor.user.name,
        role: args.role,
      });
    return { role: args.role };
  },
});

export const putDeveloper = mutation({
  args: { secret, profile, embedding: v.array(v.number()) },
  handler: async (ctx, args) => {
    const { user } = await access(ctx, args.secret, ["developer"]);
    const input = developerSchema.parse(args.profile);
    const old = await findDeveloper(ctx, user.id);
    const profile = { ...old?.profile, ...input };
    const values = {
      userId: user.id,
      name: user.name,
      cityKey: profile.city.trim().toLowerCase(),
      profile,
      embedding: vectorSchema.parse(args.embedding),
      embeddingModel: EMBEDDING_MODEL,
      updatedAt: Date.now(),
    };
    if (old) await ctx.db.patch(old._id, values);
    else await ctx.db.insert("developers", { ...values, location: null });
    return { id: user.id, ...profile };
  },
});

export const ownProfile = query({
  args: { secret },
  handler: async (ctx, args) => {
    const { user } = await access(ctx, args.secret, ["developer"]);
    const row = await findDeveloper(ctx, user.id);
    if (!row) fail(404, "Create a developer profile first");
    return ownDeveloper(await developerData(ctx, row));
  },
});

export const updateDeveloperPreferences = mutation({
  args: { secret, preferences: v.object(developerPreferences) },
  handler: async (ctx, args) => {
    const { user } = await access(ctx, args.secret, ["developer"]);
    const row = await findDeveloper(ctx, user.id);
    if (!row) fail(404, "Create a developer profile first");
    const preferences = developerPreferencesSchema.parse(args.preferences);
    await ctx.db.patch(row._id, {
      profile: { ...row.profile, ...preferences },
      updatedAt: Date.now(),
    });
    return { id: user.id, ...preferences };
  },
});

export const patchDeveloper = mutation({
  args: {
    secret,
    available: v.optional(v.boolean()),
    discoverable: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { user } = await access(ctx, args.secret, ["developer"]);
    const row = await findDeveloper(ctx, user.id);
    if (!row) fail(404, "Create a developer profile first");
    const update = {
      ...(args.available === undefined ? {} : { available: args.available }),
      ...(args.discoverable === undefined
        ? {}
        : { discoverable: args.discoverable }),
    };
    if (!Object.keys(update).length)
      fail(400, "Choose availability or discovery visibility");
    await ctx.db.patch(row._id, {
      profile: { ...row.profile, ...update },
      updatedAt: Date.now(),
    });
    return { id: user.id, ...update };
  },
});

export const setLocation = mutation({
  args: { secret, location },
  handler: async (ctx, args) => {
    const { user } = await access(ctx, args.secret, ["developer"]);
    const row = await findDeveloper(ctx, user.id);
    if (!row) fail(404, "Create a developer profile first");
    const location = developerLocationSchema.parse(args.location);
    await ctx.db.patch(row._id, { location, updatedAt: Date.now() });
    return { id: user.id, location };
  },
});

export const developers = query({
  args: { secret, ...pagination },
  handler: async (ctx, args) => {
    await access(ctx, args.secret, ["requester"]);
    checkLimit(args.limit);
    const rows = await ctx.db
      .query("developers")
      .withIndex("by_user", (q) => q.gt("userId", args.after))
      .filter((q) => q.eq(q.field("profile.discoverable"), true))
      .take(args.limit + 1);
    return page(
      await Promise.all(
        rows.map(async (row) => publicDeveloper(await developerData(ctx, row))),
      ),
      args.after,
      args.limit,
    );
  },
});

export const createOpportunity = mutation({
  args: {
    secret,
    id: v.string(),
    details: opportunity,
    analysis,
    embedding: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    const { user } = await access(ctx, args.secret, ["requester"]);
    const details = opportunitySchema.parse(args.details);
    const analysis = analysisSchema.parse(args.analysis);
    const id = args.id;
    await ctx.db.insert("opportunities", {
      id,
      ownerId: user.id,
      ownerName: user.name,
      cityKey: details.city.trim().toLowerCase(),
      details,
      analysis,
      embedding: vectorSchema.parse(args.embedding),
      analysisModel: ANALYSIS_MODEL,
      analysisVersion: ANALYSIS_VERSION,
      embeddingModel: EMBEDDING_MODEL,
      createdAt: Date.now(),
      status: "open",
    });
    return { id, ...details, analysis, status: "open" as const };
  },
});

export const opportunities = query({
  args: {
    secret,
    ...pagination,
    city: v.optional(v.string()),
    kind: v.optional(v.union(v.literal("paid"), v.literal("volunteer"))),
  },
  handler: async (ctx, args) => {
    await access(ctx, args.secret);
    checkLimit(args.limit);
    const rows = await ctx.db
      .query("opportunities")
      .withIndex("by_public_id", (q) => q.gt("id", args.after))
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "open"),
          args.city
            ? q.or(
                q.eq(q.field("details.remote"), true),
                q.eq(q.field("cityKey"), args.city.trim().toLowerCase()),
              )
            : true,
          args.kind ? q.eq(q.field("details.kind"), args.kind) : true,
        ),
      )
      .take(args.limit + 1);
    return page(
      rows.map((row) => publicOpportunity(opportunityData(row))),
      args.after,
      args.limit,
    );
  },
});

export const getOpportunity = query({
  args: { secret, id: v.string() },
  handler: async (ctx, args) => {
    await access(ctx, args.secret);
    const row = await findOpportunity(ctx, args.id);
    if (!row) fail(404, "Opportunity not found");
    return publicOpportunity(opportunityData(row));
  },
});

export const updateOpportunity = mutation({
  args: {
    secret,
    id: v.string(),
    status: v.union(v.literal("open"), v.literal("closed")),
  },
  handler: async (ctx, args) => {
    const { user } = await access(ctx, args.secret, ["requester"]);
    const row = await findOpportunity(ctx, args.id);
    if (!row) fail(404, "Opportunity not found");
    if (row.ownerId !== user.id)
      fail(403, "Only the opportunity owner can access this");
    await ctx.db.patch(row._id, { status: args.status });
    return { id: row.id, status: args.status };
  },
});

export const matches = query({
  args: { secret, id: v.string(), limit: v.number() },
  handler: async (ctx, args) => {
    const { user } = await access(ctx, args.secret, ["requester"]);
    checkLimit(args.limit);
    const row = await findOpportunity(ctx, args.id);
    if (!row) fail(404, "Opportunity not found");
    if (row.ownerId !== user.id)
      fail(403, "Only the opportunity owner can access this");
    const job = opportunityData(row);
    const candidates = await ctx.db
      .query("developers")
      .filter((q) =>
        q.and(
          q.eq(q.field("profile.available"), true),
          q.eq(q.field("profile.discoverable"), true),
          q.gte(q.field("profile.weeklyHours"), job.minimumWeeklyHours),
          job.remote
            ? true
            : q.eq(q.field("cityKey"), job.city.trim().toLowerCase()),
          job.kind === "paid"
            ? true
            : q.eq(q.field("profile.acceptsVolunteer"), true),
        ),
      )
      .take(1001);
    if (candidates.length > 1000)
      fail(
        503,
        "Candidate pool exceeds the MVP limit; narrow opportunity constraints",
      );
    const ranked = rankDevelopers(
      job,
      await Promise.all(candidates.map((d) => developerData(ctx, d))),
    );
    return {
      data: ranked.slice(0, args.limit),
      total: ranked.length,
      version: MATCH_VERSION,
      weights: WEIGHTS,
    };
  },
});

export const ownMatch = query({
  args: { secret, id: v.string() },
  handler: async (ctx, args) => {
    const { user } = await access(ctx, args.secret, ["developer"]);
    const row = await findOpportunity(ctx, args.id);
    const profile = await findDeveloper(ctx, user.id);
    if (!row || !profile) fail(404, "Opportunity or profile not found");
    const job = opportunityData(row);
    const dev = await developerData(ctx, profile);
    return {
      data: rankDevelopers(job, [dev])[0] ?? null,
      ineligibleReasons: eligibility(job, dev),
      status: job.status,
      version: MATCH_VERSION,
      weights: WEIGHTS,
    };
  },
});

export const setInterest = mutation({
  args: {
    secret,
    id: v.string(),
    developerId: v.optional(v.string()),
    interested: v.boolean(),
  },
  handler: async (ctx, args) => {
    const actor = await access(ctx, args.secret, ["requester", "developer"]);
    const row = await findOpportunity(ctx, args.id);
    if (!row) fail(404, "Opportunity not found");
    const requester = actor.role === "requester";
    if (requester && row.ownerId !== actor.user.id)
      fail(403, "Only the opportunity owner can express requester interest");
    if (!requester && args.developerId && args.developerId !== actor.user.id)
      fail(403, "You can only express interest for yourself");
    const developerId = requester ? args.developerId : actor.user.id;
    if (!developerId) fail(400, "Choose a developer");
    const devRow = await findDeveloper(ctx, developerId);
    if (!devRow) fail(404, "Developer not found");
    if (
      args.interested &&
      (row.status !== "open" ||
        eligibility(opportunityData(row), await developerData(ctx, devRow))
          .length)
    )
      fail(409, "An open opportunity and eligible developer are required");
    const old = await ctx.db
      .query("interests")
      .withIndex("by_pair", (q) =>
        q.eq("opportunityId", row.id).eq("developerId", developerId),
      )
      .unique();
    const values = {
      opportunityId: row.id,
      developerId,
      companyInterested: requester
        ? args.interested
        : (old?.companyInterested ?? false),
      developerInterested: requester
        ? (old?.developerInterested ?? false)
        : args.interested,
      firstCompanyInterestAt:
        old?.firstCompanyInterestAt ??
        (requester && args.interested ? Date.now() : null),
      updatedAt: Date.now(),
    };
    if (old) await ctx.db.patch(old._id, values);
    else await ctx.db.insert("interests", values);
    return {
      opportunityId: row.id,
      developerId,
      requesterInterested: values.companyInterested,
      developerInterested: values.developerInterested,
      connected: values.companyInterested && values.developerInterested,
    };
  },
});

export const connections = query({
  args: { secret, ...pagination, connectedOnly: v.boolean() },
  handler: async (ctx, args) => {
    const actor = await access(ctx, args.secret, ["requester", "developer"]);
    checkLimit(args.limit);
    const rows =
      actor.role === "developer"
        ? await ctx.db
            .query("interests")
            .withIndex("by_developer", (q) =>
              q.eq("developerId", actor.user.id),
            )
            .collect()
        : await ctx.db.query("interests").collect();
    const result = [];
    for (const row of rows) {
      if (
        args.connectedOnly
          ? !row.companyInterested || !row.developerInterested
          : !row.companyInterested && !row.developerInterested
      )
        continue;
      const job = await findOpportunity(ctx, row.opportunityId);
      if (!job || (actor.role === "requester" && job.ownerId !== actor.user.id))
        continue;
      const dev = await findDeveloper(ctx, row.developerId);
      if (!dev) continue;
      result.push({
        id: `${job.id}:${row.developerId}`,
        opportunityId: job.id,
        developerId: row.developerId,
        title: job.details.title,
        developerName: dev.name,
        requesterName: job.ownerName,
        requesterInterested: row.companyInterested,
        developerInterested: row.developerInterested,
        connected: row.companyInterested && row.developerInterested,
      });
    }
    return page(result, args.after, args.limit);
  },
});

export const createRequest = mutation({
  args: {
    secret,
    id: v.string(),
    details: request,
    analysis,
    embedding: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    const { user } = await access(ctx, args.secret, ["requester"]);
    const details = requestSchema.parse(args.details);
    const analysis = analysisSchema.parse(args.analysis);
    const id = args.id;
    await ctx.db.insert("requests", {
      id,
      ownerId: user.id,
      ownerName: user.name,
      details,
      analysis,
      embedding: vectorSchema.parse(args.embedding),
      analysisModel: ANALYSIS_MODEL,
      analysisVersion: ANALYSIS_VERSION,
      embeddingModel: EMBEDDING_MODEL,
      status: "open",
      claimedBy: null,
      claimantName: null,
      createdAt: Date.now(),
    });
    return {
      id,
      ...details,
      analysis,
      status: "open" as const,
      claimedBy: null,
      claimantName: null,
      ownerId: user.id,
      ownerName: user.name,
    };
  },
});

export const ownedRequests = query({
  args: { secret, ...pagination },
  handler: async (ctx, args) => {
    const { user } = await access(ctx, args.secret, ["requester"]);
    checkLimit(args.limit);
    const rows = await ctx.db
      .query("requests")
      .withIndex("by_owner", (q) => q.eq("ownerId", user.id))
      .collect();
    return page(
      rows.map((row) => publicRequest(requestData(row))),
      args.after,
      args.limit,
    );
  },
});

export const nearbyRequests = query({
  args: { secret, limit: v.number() },
  handler: async (ctx, args) => {
    const { user } = await access(ctx, args.secret, ["developer"]);
    checkLimit(args.limit);
    const profile = await findDeveloper(ctx, user.id);
    if (!profile) fail(404, "Create a developer profile first");
    if (!profile.location)
      fail(400, "Set a map pin and radius before browsing nearby requests");
    const box = boundingBox(
      profile.location.latitude,
      profile.location.longitude,
      profile.location.radiusKm,
    );
    const candidates = await ctx.db
      .query("requests")
      .withIndex("by_status_latitude", (q) =>
        q
          .eq("status", "open")
          .gte("details.latitude", box.minLat)
          .lte("details.latitude", box.maxLat),
      )
      .filter((q) =>
        q.and(
          q.gte(q.field("details.longitude"), box.minLng),
          q.lte(q.field("details.longitude"), box.maxLng),
        ),
      )
      .take(1001);
    if (candidates.length > 1000)
      fail(
        503,
        "Nearby request pool exceeds the MVP limit; shrink your radius",
      );
    const dev = await developerData(ctx, profile);
    const ranked = rankNearbyRequests(candidates.map(requestData), dev);
    return {
      data: ranked.slice(0, args.limit),
      total: ranked.length,
      version: MATCH_VERSION,
      weights: WEIGHTS,
      location: dev.location,
    };
  },
});

export const getRequest = query({
  args: { secret, id: v.string() },
  handler: async (ctx, args) => {
    const actor = await access(ctx, args.secret);
    const row = await findRequest(ctx, args.id);
    if (!row) fail(404, "Request not found");
    if (!(
      (actor.role === "requester" && row.ownerId === actor.user.id) ||
      (actor.role === "developer" &&
        (row.status === "open" || row.claimedBy === actor.user.id))
    ))
      fail(403, "Only the requester or an eligible developer can view this");
    return publicRequest(requestData(row));
  },
});

export const closeRequest = mutation({
  args: { secret, id: v.string() },
  handler: async (ctx, args) => {
    const { user } = await access(ctx, args.secret, ["requester"]);
    const row = await findRequest(ctx, args.id);
    if (!row) fail(404, "Request not found");
    if (row.ownerId !== user.id) fail(403, "Only the requester can close this");
    await ctx.db.patch(row._id, {
      status: "closed",
      claimedBy: null,
      claimantName: null,
    });
    return { id: row.id, status: "closed" as const, claimedBy: null };
  },
});

export const acceptRequest = mutation({
  args: { secret, id: v.string() },
  handler: async (ctx, args) => {
    const { user } = await access(ctx, args.secret, ["developer"]);
    const profile = await findDeveloper(ctx, user.id);
    if (!profile) fail(404, "Create a developer profile first");
    if (!profile.location)
      fail(400, "Set a map pin and radius before accepting requests");
    const row = await findRequest(ctx, args.id);
    if (!row) fail(404, "Request not found");
    if (row.status === "claimed" && row.claimedBy === user.id)
      return publicRequest(requestData(row));
    if (row.status !== "open")
      fail(409, "Only an open request can be accepted");
    if (
      !rankNearbyRequests([requestData(row)], await developerData(ctx, profile))
        .length
    )
      fail(409, "This request is outside your radius or eligibility");
    await ctx.db.patch(row._id, {
      status: "claimed",
      claimedBy: user.id,
      claimantName: user.name,
    });
    return publicRequest(
      requestData({
        ...row,
        status: "claimed",
        claimedBy: user.id,
        claimantName: user.name,
      }),
    );
  },
});

export const releaseRequest = mutation({
  args: { secret, id: v.string() },
  handler: async (ctx, args) => {
    const actor = await access(ctx, args.secret, ["developer", "requester"]);
    const row = await findRequest(ctx, args.id);
    if (!row) fail(404, "Request not found");
    if (!(
      (actor.role === "developer" && row.claimedBy === actor.user.id) ||
      (actor.role === "requester" && row.ownerId === actor.user.id)
    ))
      fail(403, "Only the claimant or requester can release this");
    if (row.status !== "claimed")
      fail(409, "Only a claimed request can be released");
    await ctx.db.patch(row._id, {
      status: "open",
      claimedBy: null,
      claimantName: null,
    });
    return publicRequest(
      requestData({
        ...row,
        status: "open",
        claimedBy: null,
        claimantName: null,
      }),
    );
  },
});

const MAP_LIMIT = 500;

/**
 * The public Calgary map feed. Guests and non-developers receive coarse request
 * locations without requester names; see backend/listings.ts for the rules.
 */
export const mapListings = query({
  args: { secret },
  handler: async (ctx, args) => {
    const actor = await optionalAccess(ctx, args.secret);
    const viewer = actor ? { id: actor.user.id, role: actor.role } : null;
    const jobs = await ctx.db
      .query("opportunities")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .take(MAP_LIMIT + 1);
    const open = await ctx.db
      .query("requests")
      .withIndex("by_status_latitude", (q) =>
        q
          .eq("status", "open")
          .gte("details.latitude", CALGARY_BOUNDS[0][1])
          .lte("details.latitude", CALGARY_BOUNDS[1][1]),
      )
      .take(MAP_LIMIT + 1);
    // People involved in a claim keep seeing it after it leaves the open pool.
    const involved =
      viewer?.role === "developer"
        ? await ctx.db
            .query("requests")
            .withIndex("by_claimant", (q) => q.eq("claimedBy", viewer.id))
            .take(MAP_LIMIT)
        : viewer?.role === "requester"
          ? await ctx.db
              .query("requests")
              .withIndex("by_owner", (q) => q.eq("ownerId", viewer.id))
              .filter((q) => q.eq(q.field("status"), "claimed"))
              .take(MAP_LIMIT)
          : [];
    const listings = new Map<string, CityJob>();
    for (const row of jobs.slice(0, MAP_LIMIT)) {
      const listing = opportunityListing(row, viewer);
      if (listing) listings.set(listing.id, listing);
    }
    for (const row of [...open.slice(0, MAP_LIMIT), ...involved]) {
      const listing = requestListing(row, viewer);
      if (listing) listings.set(listing.id, listing);
    }
    return {
      viewer: actor ? { name: actor.user.name, role: actor.role } : null,
      listings: [...listings.values()],
      truncated: jobs.length > MAP_LIMIT || open.length > MAP_LIMIT,
    };
  },
});

export const ownedOpportunities = query({
  args: { secret, ...pagination },
  handler: async (ctx, args) => {
    const { user } = await access(ctx, args.secret, ["requester"]);
    checkLimit(args.limit);
    const rows = await ctx.db
      .query("opportunities")
      .withIndex("by_owner", (q) => q.eq("ownerId", user.id))
      .collect();
    return page(
      rows.map((row) => publicOpportunity(opportunityData(row))),
      args.after,
      args.limit,
    );
  },
});

export const reviseOpportunity = mutation({
  args: {
    secret,
    id: v.string(),
    details: opportunity,
    analysis,
    embedding: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    const { user } = await access(ctx, args.secret, ["requester"]);
    const row = await findOpportunity(ctx, args.id);
    if (!row) fail(404, "Opportunity not found");
    if (row.ownerId !== user.id)
      fail(403, "Only the opportunity owner can edit this");
    const details = opportunitySchema.parse(args.details);
    const values = {
      cityKey: details.city.trim().toLowerCase(),
      details,
      analysis: analysisSchema.parse(args.analysis),
      embedding: vectorSchema.parse(args.embedding),
      analysisModel: ANALYSIS_MODEL,
      analysisVersion: ANALYSIS_VERSION,
      embeddingModel: EMBEDDING_MODEL,
    };
    await ctx.db.patch(row._id, values);
    return publicOpportunity(opportunityData({ ...row, ...values }));
  },
});

export const claimedRequests = query({
  args: { secret, ...pagination },
  handler: async (ctx, args) => {
    const { user } = await access(ctx, args.secret, ["developer"]);
    checkLimit(args.limit);
    const rows = await ctx.db
      .query("requests")
      .withIndex("by_claimant", (q) => q.eq("claimedBy", user.id))
      .collect();
    return page(
      rows
        .filter((row) => row.status === "claimed")
        .map((row) => publicRequest(requestData(row))),
      args.after,
      args.limit,
    );
  },
});

export const reviseRequest = mutation({
  args: {
    secret,
    id: v.string(),
    details: request,
    analysis,
    embedding: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    const { user } = await access(ctx, args.secret, ["requester"]);
    const row = await findRequest(ctx, args.id);
    if (!row) fail(404, "Request not found");
    if (row.ownerId !== user.id) fail(403, "Only the requester can edit this");
    // Editing a claimed request could move it outside the claimant's radius.
    if (row.status === "claimed")
      fail(409, "Release the claim before editing this request");
    if (row.status === "closed") fail(409, "Closed requests cannot be edited");
    const values = {
      details: requestSchema.parse(args.details),
      analysis: analysisSchema.parse(args.analysis),
      embedding: vectorSchema.parse(args.embedding),
      analysisModel: ANALYSIS_MODEL,
      analysisVersion: ANALYSIS_VERSION,
      embeddingModel: EMBEDDING_MODEL,
    };
    await ctx.db.patch(row._id, values);
    return publicRequest(requestData({ ...row, ...values }));
  },
});

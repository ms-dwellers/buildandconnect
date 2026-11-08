import type { Doc } from "./_generated/dataModel";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Developer, Opportunity, LocalRequest } from "../backend/schemas";
import { summarizeSkillEvidence } from "../backend/skill-evidence";

type Context = QueryCtx | MutationCtx;

export const findDeveloper = (ctx: Context, userId: string) =>
  ctx.db
    .query("developers")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
export const findOpportunity = (ctx: Context, id: string) =>
  ctx.db
    .query("opportunities")
    .withIndex("by_public_id", (q) => q.eq("id", id))
    .unique();
export const findRequest = (ctx: Context, id: string) =>
  ctx.db
    .query("requests")
    .withIndex("by_public_id", (q) => q.eq("id", id))
    .unique();

export async function developerData(
  ctx: Context,
  row: Doc<"developers">,
): Promise<Developer> {
  const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const interests = await ctx.db
    .query("interests")
    .withIndex("by_developer", (q) => q.eq("developerId", row.userId))
    .collect();
  const evidence = await ctx.db
    .query("projectSkillEvidence")
    .withIndex("by_developer", (q) => q.eq("developerId", row.userId))
    .collect();
  return {
    ...row.profile,
    revision: row.updatedAt,
    id: row.userId,
    name: row.name,
    embedding: row.embedding,
    location: row.location,
    skillEvidence: summarizeSkillEvidence(evidence),
    recentExposure: interests.filter(
      (item) =>
        item.firstCompanyInterestAt !== null &&
        item.firstCompanyInterestAt >= since,
    ).length,
  };
}

export function opportunityData(row: Doc<"opportunities">): Opportunity {
  return {
    ...row.details,
    revision: row.revision ?? 0,
    id: row.id,
    ownerId: row.ownerId,
    status: row.status,
    analysis: row.analysis,
    embedding: row.embedding,
  };
}
export function requestData(row: Doc<"requests">): LocalRequest {
  return {
    revision: row.revision ?? 0,
    ...row.details,
    id: row.id,
    ownerId: row.ownerId,
    ownerName: row.ownerName,
    status: row.status,
    claimedBy: row.claimedBy,
    claimantName: row.claimantName,
    analysis: row.analysis,
    embedding: row.embedding,
    createdAt: row.createdAt,
  };
}
export function page<T extends { id: string }>(
  items: T[],
  after: string,
  limit: number,
) {
  const rows = items
    .filter((item) => item.id > after)
    .sort((a, b) => a.id.localeCompare(b.id));
  const data = rows.slice(0, limit);
  return { data, nextCursor: rows.length > limit ? data.at(-1)!.id : null };
}

export function publicDeveloper(developer: Developer) {
  const {
    embedding: _embedding,
    recentExposure: _exposure,
    location: _location,
    ...profile
  } = developer;
  return profile;
}
export function ownDeveloper(developer: Developer) {
  const {
    embedding: _embedding,
    recentExposure: _exposure,
    ...profile
  } = developer;
  return profile;
}
export function publicOpportunity(opportunity: Opportunity) {
  const { embedding: _embedding, ...details } = opportunity;
  return details;
}
export function publicRequest(request: LocalRequest) {
  const { embedding: _embedding, ...details } = request;
  return details;
}

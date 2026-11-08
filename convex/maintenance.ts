import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { components, internal } from "./_generated/api";
import { analyzeDeveloper } from "../backend/ai.ts";
import { EMBEDDING_MODEL } from "../backend/models.ts";
import { vectorSchema } from "../backend/schemas.ts";
import { fireworksAI } from "./ai";

// Operator-only migration; never exposed through application HTTP routes.
export const outdatedDeveloperEmbeddings = internalQuery({
  args: {},
  handler: async (ctx) =>
    ctx.db
      .query("developers")
      .filter((q) => q.neq(q.field("embeddingModel"), EMBEDDING_MODEL))
      .take(25),
});

export const replaceDeveloperEmbedding = internalMutation({
  args: {
    id: v.id("developers"),
    expectedUpdatedAt: v.number(),
    expectedModel: v.string(),
    embedding: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id);
    if (
      !row ||
      row.updatedAt !== args.expectedUpdatedAt ||
      row.embeddingModel !== args.expectedModel
    )
      return false;
    await ctx.db.patch(row._id, {
      embedding: vectorSchema.parse(args.embedding),
      embeddingModel: EMBEDDING_MODEL,
    });
    return true;
  },
});

export const refreshDeveloperEmbeddings = internalAction({
  args: {},
  handler: async (ctx): Promise<{ updated: number; skipped: number }> => {
    const rows = await ctx.runQuery(
      internal.maintenance.outdatedDeveloperEmbeddings,
      {},
    );
    let updated = 0;
    for (const row of rows) {
      const embedding = await analyzeDeveloper(fireworksAI(), row.profile);
      if (
        await ctx.runMutation(internal.maintenance.replaceDeveloperEmbedding, {
          id: row._id,
          expectedUpdatedAt: row.updatedAt,
          expectedModel: row.embeddingModel,
          embedding,
        })
      )
        updated++;
    }
    return { updated, skipped: rows.length - updated };
  },
});

// Operator-only cleanup for accounts created by the opt-in live verification suite.
export const cleanupVerification = internalMutation({
  args: { userIds: v.array(v.string()) },
  handler: async (ctx, { userIds }) => {
    if (process.env.ALLOW_TEST_CLEANUP !== "true")
      throw new Error("Verification cleanup is disabled");
    for (const id of userIds) {
      const user = await ctx.runQuery(components.betterAuth.adapter.findOne, {
        model: "user",
        where: [{ field: "_id", value: id }],
      });
      if (user && !user.email.endsWith("@example.test"))
        throw new Error("Only reserved test-domain accounts can be removed");
    }
    for (const id of userIds) {
      for (const row of await ctx.db
        .query("projectDrafts")
        .withIndex("by_owner", (q) => q.eq("ownerId", id))
        .collect())
        await ctx.db.delete(row._id);
      for (const row of await ctx.db
        .query("careerTargets")
        .withIndex("by_developer", (q) => q.eq("developerId", id))
        .collect())
        await ctx.db.delete(row._id);
      for (const row of await ctx.db
        .query("members")
        .withIndex("by_user", (q) => q.eq("userId", id))
        .collect())
        await ctx.db.delete(row._id);
      for (const row of await ctx.db
        .query("developers")
        .withIndex("by_user", (q) => q.eq("userId", id))
        .collect())
        await ctx.db.delete(row._id);
      for (const row of await ctx.db
        .query("opportunities")
        .withIndex("by_owner", (q) => q.eq("ownerId", id))
        .collect()) {
        for (const interest of await ctx.db
          .query("interests")
          .withIndex("by_pair", (q) => q.eq("opportunityId", row.id))
          .collect())
          await ctx.db.delete(interest._id);
        await ctx.db.delete(row._id);
      }
      for (const row of await ctx.db
        .query("requests")
        .withIndex("by_owner", (q) => q.eq("ownerId", id))
        .collect())
        await ctx.db.delete(row._id);
      for (const row of await ctx.db
        .query("requests")
        .filter((q) => q.eq(q.field("claimedBy"), id))
        .collect())
        await ctx.db.patch(row._id, {
          status: "open",
          claimedBy: null,
          claimantName: null,
        });
      for (const row of await ctx.db
        .query("interests")
        .withIndex("by_developer", (q) => q.eq("developerId", id))
        .collect())
        await ctx.db.delete(row._id);
      for (const model of ["session", "account"] as const) {
        await ctx.runMutation(components.betterAuth.adapter.deleteMany, {
          input: { model, where: [{ field: "userId", value: id }] },
          paginationOpts: { cursor: null, numItems: 100 },
        });
      }
      await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
        input: { model: "user", where: [{ field: "_id", value: id }] },
      });
    }
    return { removed: userIds.length };
  },
});

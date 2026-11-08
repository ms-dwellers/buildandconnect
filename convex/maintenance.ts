import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { components } from "./_generated/api";

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

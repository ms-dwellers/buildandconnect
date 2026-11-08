import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "./_generated/server";
import type { Doc, Id, TableNames } from "./_generated/dataModel";
import { components } from "./_generated/api";
import { fail } from "./access";

const key = "production-demo" as const;
type CoreTable = "members" | "developers" | "opportunities" | "requests";
type SnapshotRow = Doc<"demoSnapshots">["rows"][number];

function saveRow(table: CoreTable, document: Doc<CoreTable>): SnapshotRow {
  const { _id, _creationTime: _created, ...value } = document;
  return { table, id: _id, value };
}

async function baseline(ctx: MutationCtx) {
  const snapshot = await ctx.db
    .query("demoSnapshots")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  if (!snapshot) fail(503, "The demo reset has not been configured.");
  return snapshot;
}

export const status = internalQuery({
  args: {},
  handler: async (ctx) => {
    const snapshot = await ctx.db
      .query("demoSnapshots")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    return { ready: Boolean(snapshot), generation: snapshot?.generation ?? 0 };
  },
});

// Operator-only initialization. A browser can never supply its own snapshot.
export const capture = internalMutation({
  args: { userIds: v.array(v.string()) },
  handler: async (ctx, { userIds }) => {
    if (userIds.length !== 50 || new Set(userIds).size !== 50)
      fail(400, "Select exactly 50 distinct demo accounts.");
    if (
      await ctx.db
        .query("demoSnapshots")
        .withIndex("by_key", (q) => q.eq("key", key))
        .unique()
    )
      fail(409, "A demo baseline already exists; it was not replaced.");

    const users: Doc<"demoSnapshots">["users"] = [];
    const rows: SnapshotRow[] = [];
    let developers = 0;
    let requesters = 0;
    for (const id of userIds) {
      const user = await ctx.runQuery(components.betterAuth.adapter.findOne, {
        model: "user",
        where: [{ field: "_id", value: id }],
      });
      if (
        !user ||
        !user.email.endsWith("@buildandconnect.work") ||
        !user.name.endsWith(" (Demo)")
      )
        fail(400, "Only the seeded demo accounts can be captured.");
      users.push({ id, name: user.name });
      const member = await ctx.db
        .query("members")
        .withIndex("by_user", (q) => q.eq("userId", id))
        .unique();
      if (!member) fail(400, "Every demo account needs a role.");
      rows.push(saveRow("members", member));
      if (member.role === "developer") {
        developers++;
        const profile = await ctx.db
          .query("developers")
          .withIndex("by_user", (q) => q.eq("userId", id))
          .unique();
        if (!profile) fail(400, "Every demo developer needs a profile.");
        rows.push(saveRow("developers", profile));
      } else if (member.role === "requester") {
        requesters++;
        const opportunities = await ctx.db
          .query("opportunities")
          .withIndex("by_owner", (q) => q.eq("ownerId", id))
          .collect();
        const requests = await ctx.db
          .query("requests")
          .withIndex("by_owner", (q) => q.eq("ownerId", id))
          .collect();
        if (opportunities.length !== 2 || requests.length !== 1)
          fail(
            400,
            "Each demo requester needs two projects and one local request.",
          );
        rows.push(
          ...opportunities.map((row) => saveRow("opportunities", row)),
          ...requests.map((row) => saveRow("requests", row)),
        );
      } else fail(400, "Only developer and requester roles are supported.");
    }
    if (developers !== 25 || requesters !== 25)
      fail(400, "The demo needs 25 developers and 25 requesters.");
    await ctx.db.insert("demoSnapshots", {
      key,
      users,
      rows,
      capturedAt: Date.now(),
      generation: 0,
      lastResetAt: null,
    });
    return {
      accounts: users.length,
      profiles: developers,
      opportunities: 50,
      requests: 25,
    };
  },
});

async function removeRows(
  ctx: MutationCtx,
  rows: { _id: Id<TableNames> }[],
  removed: Set<string>,
) {
  for (const row of rows) {
    if (removed.has(row._id)) continue;
    await ctx.db.delete(row._id);
    removed.add(row._id);
  }
}

// Public access is a deliberate demo feature, guarded by an explicit deployment flag.
// This single transaction restores only captured accounts and their related activity.
export const reset = internalMutation({
  args: { expectedGeneration: v.number() },
  handler: async (
    ctx,
    { expectedGeneration },
  ): Promise<{ generation: number }> => {
    if (process.env.PUBLIC_DEMO_RESET !== "true")
      fail(403, "The public demo reset is disabled.");
    const snapshot = await baseline(ctx);
    if (snapshot.generation !== expectedGeneration)
      return { generation: snapshot.generation };
    const removed = new Set<string>();
    const keep = new Set(snapshot.rows.map((row) => row.id));
    const opportunityIds = new Set<string>();

    for (const user of snapshot.users) {
      const existing = await ctx.runQuery(
        components.betterAuth.adapter.findOne,
        { model: "user", where: [{ field: "_id", value: user.id }] },
      );
      if (!existing)
        fail(409, "A demo account was deleted. Restore it before resetting.");
      if (existing.name !== user.name)
        await ctx.runMutation(components.betterAuth.adapter.updateOne, {
          input: {
            model: "user",
            where: [{ field: "_id", value: user.id }],
            update: { name: user.name },
          },
        });

      const members = await ctx.db
        .query("members")
        .withIndex("by_user", (q) => q.eq("userId", user.id))
        .collect();
      const profiles = await ctx.db
        .query("developers")
        .withIndex("by_user", (q) => q.eq("userId", user.id))
        .collect();
      const opportunities = await ctx.db
        .query("opportunities")
        .withIndex("by_owner", (q) => q.eq("ownerId", user.id))
        .collect();
      const requests = await ctx.db
        .query("requests")
        .withIndex("by_owner", (q) => q.eq("ownerId", user.id))
        .collect();
      for (const row of opportunities) opportunityIds.add(row.id);
      await removeRows(
        ctx,
        [...members, ...profiles, ...opportunities, ...requests].filter(
          (row) => !keep.has(row._id),
        ),
        removed,
      );
      await removeRows(
        ctx,
        await ctx.db
          .query("projectDrafts")
          .withIndex("by_owner", (q) => q.eq("ownerId", user.id))
          .collect(),
        removed,
      );
      await removeRows(
        ctx,
        await ctx.db
          .query("careerTargets")
          .withIndex("by_developer", (q) => q.eq("developerId", user.id))
          .collect(),
        removed,
      );
      await removeRows(
        ctx,
        await ctx.db
          .query("interests")
          .withIndex("by_developer", (q) => q.eq("developerId", user.id))
          .collect(),
        removed,
      );
      await removeRows(
        ctx,
        await ctx.db
          .query("developerReviews")
          .withIndex("by_developer", (q) => q.eq("developerId", user.id))
          .collect(),
        removed,
      );

      const conversations = [
        ...(await ctx.db
          .query("conversations")
          .withIndex("by_requester", (q) => q.eq("requesterId", user.id))
          .collect()),
        ...(await ctx.db
          .query("conversations")
          .withIndex("by_developer", (q) => q.eq("developerId", user.id))
          .collect()),
      ];
      for (const conversation of conversations) {
        if (removed.has(conversation._id)) continue;
        await removeRows(
          ctx,
          await ctx.db
            .query("messages")
            .withIndex("by_conversation", (q) =>
              q.eq("conversationId", conversation._id),
            )
            .collect(),
          removed,
        );
        await removeRows(ctx, [conversation], removed);
      }
      // A demo developer may have claimed a non-demo request; release it, don't delete it.
      for (const request of await ctx.db
        .query("requests")
        .withIndex("by_claimant", (q) => q.eq("claimedBy", user.id))
        .collect()) {
        await ctx.db.patch(request._id, {
          status: "open",
          claimedBy: null,
          claimantName: null,
          revision: (request.revision ?? 0) + 1,
        });
      }
    }

    for (const row of snapshot.rows)
      if (row.table === "opportunities") opportunityIds.add(row.value.id);
    for (const id of opportunityIds) {
      await removeRows(
        ctx,
        await ctx.db
          .query("interests")
          .withIndex("by_pair", (q) => q.eq("opportunityId", id))
          .collect(),
        removed,
      );
      await removeRows(
        ctx,
        await ctx.db
          .query("developerReviews")
          .withIndex("by_project_developer", (q) => q.eq("opportunityId", id))
          .collect(),
        removed,
      );
    }
    for (const row of snapshot.rows) {
      const id = ctx.db.normalizeId(row.table, row.id);
      if (!id) fail(409, "The demo baseline contains an invalid record.");
      if (await ctx.db.get(id)) await ctx.db.replace(id, row.value);
      else await ctx.db.insert(row.table, row.value);
    }

    let cursor: string | null = null;
    for (;;) {
      const page: { isDone: boolean; continueCursor: string } =
        await ctx.runMutation(components.betterAuth.adapter.deleteMany, {
          input: { model: "session" },
          paginationOpts: { cursor, numItems: 200 },
        });
      if (page.isDone) break;
      cursor = page.continueCursor;
    }
    const generation = snapshot.generation + 1;
    await ctx.db.patch(snapshot._id, { generation, lastResetAt: Date.now() });
    return { generation };
  },
});

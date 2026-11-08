import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { access, fail } from "./access";
import { findDeveloper, findOpportunity } from "./domain";
import {
  chatMessageSchema,
  chatReadSchema,
  chatStartSchema,
} from "../backend/chat";

const sessionId = v.optional(v.string());
const conversationId = v.string();
type Context = QueryCtx | MutationCtx;
type Actor = Awaited<ReturnType<typeof access>>;

async function participant(ctx: Context, id: string, actor: Actor) {
  const normalized = ctx.db.normalizeId("conversations", id);
  const row = normalized ? await ctx.db.get(normalized) : null;
  if (
    !row ||
    !(
      (actor.role === "requester" && row.requesterId === actor.user.id) ||
      (actor.role === "developer" && row.developerId === actor.user.id)
    )
  )
    fail(404, "Conversation not found");
  return row;
}

async function connection(ctx: Context, row: Doc<"conversations">) {
  const job = await findOpportunity(ctx, row.opportunityId);
  const interest = await ctx.db
    .query("interests")
    .withIndex("by_pair", (q) =>
      q
        .eq("opportunityId", row.opportunityId)
        .eq("developerId", row.developerId),
    )
    .unique();
  return {
    title: job?.details.title ?? row.title,
    canSend:
      !!job &&
      job.ownerId === row.requesterId &&
      !!interest?.companyInterested &&
      interest.developerInterested,
  };
}

function summary(row: Doc<"conversations">, actor: Actor) {
  const requester = actor.role === "requester";
  const read = requester
    ? row.requesterReadSequence
    : row.developerReadSequence;
  return {
    id: row._id,
    opportunityId: row.opportunityId,
    title: row.title,
    peerName: requester ? row.developerName : row.requesterName,
    lastMessage: row.lastMessage,
    lastSequence: row.lastSequence,
    unread: row.lastSequence - read,
    updatedAt: row.updatedAt,
  };
}

const message = (row: Doc<"messages">) => ({
  id: row._id,
  senderId: row.senderId,
  clientId: row.clientId,
  body: row.body,
  sequence: row.sequence,
  sentAt: row.sentAt,
});

async function history(ctx: Context, id: Id<"conversations">, before?: number) {
  const rows = await ctx.db
    .query("messages")
    .withIndex("by_conversation", (q) => {
      const range = q.eq("conversationId", id);
      return before === undefined ? range : range.lt("sequence", before);
    })
    .order("desc")
    .take(51);
  return {
    messages: rows.slice(0, 50).reverse().map(message),
    hasMore: rows.length > 50,
  };
}

export const start = internalMutation({
  args: {
    sessionId,
    opportunityId: v.string(),
    developerId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await access(ctx, args.sessionId, ["requester", "developer"]);
    const input = chatStartSchema.parse({
      opportunityId: args.opportunityId,
      developerId: args.developerId,
    });
    const job = await findOpportunity(ctx, input.opportunityId);
    const developerId =
      actor.role === "developer" ? actor.user.id : input.developerId;
    if (
      !job ||
      !developerId ||
      (actor.role === "requester" && job.ownerId !== actor.user.id) ||
      (actor.role === "developer" &&
        input.developerId &&
        input.developerId !== actor.user.id)
    )
      fail(404, "Connection not found");
    const existing = await ctx.db
      .query("conversations")
      .withIndex("by_pair", (q) =>
        q.eq("opportunityId", job.id).eq("developerId", developerId),
      )
      .unique();
    if (existing) {
      await participant(ctx, existing._id, actor);
      return { id: existing._id };
    }
    const interest = await ctx.db
      .query("interests")
      .withIndex("by_pair", (q) =>
        q.eq("opportunityId", job.id).eq("developerId", developerId),
      )
      .unique();
    if (!interest?.companyInterested || !interest.developerInterested)
      fail(
        409,
        "Both sides must express interest before starting a conversation",
      );
    const dev = await findDeveloper(ctx, developerId);
    if (!dev) fail(404, "Developer not found");
    const id = await ctx.db.insert("conversations", {
      opportunityId: job.id,
      requesterId: job.ownerId,
      developerId,
      requesterName: job.ownerName,
      developerName: dev.name,
      title: job.details.title,
      lastSequence: 0,
      requesterReadSequence: 0,
      developerReadSequence: 0,
      lastMessage: "",
      updatedAt: Date.now(),
    });
    return { id };
  },
});

// This read-only subscription derives its session from the verified Better Auth JWT.
// All writes remain internal functions reached through authenticated HTTP actions.
export const watch = query({
  args: { conversationId: v.optional(conversationId), inboxLimit: v.number() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || typeof identity.sessionId !== "string")
      fail(401, "Sign in to continue");
    const actor = await access(ctx, identity.sessionId, [
      "developer",
      "requester",
    ]);
    if (actor.user.id !== identity.subject) fail(401, "Sign in to continue");
    return readSnapshot(ctx, args, actor);
  },
});

export const snapshot = internalQuery({
  args: {
    sessionId,
    conversationId: v.optional(conversationId),
    inboxLimit: v.number(),
  },
  handler: async (ctx, args) => {
    const actor = await access(ctx, args.sessionId, ["developer", "requester"]);
    return readSnapshot(ctx, args, actor);
  },
});

async function readSnapshot(
  ctx: QueryCtx,
  args: { conversationId?: string; inboxLimit: number },
  actor: Actor,
) {
  if (
    !Number.isInteger(args.inboxLimit) ||
    args.inboxLimit < 20 ||
    args.inboxLimit > 200
  )
    fail(400, "Choose between 20 and 200 conversations");
  const rows =
    actor.role === "requester"
      ? await ctx.db
          .query("conversations")
          .withIndex("by_requester", (q) => q.eq("requesterId", actor.user.id))
          .order("desc")
          .take(args.inboxLimit + 1)
      : await ctx.db
          .query("conversations")
          .withIndex("by_developer", (q) => q.eq("developerId", actor.user.id))
          .order("desc")
          .take(args.inboxLimit + 1);
  const inbox = rows
    .slice(0, args.inboxLimit)
    .map((row) => summary(row, actor));
  if (!args.conversationId)
    return {
      inbox,
      hasMore: rows.length > args.inboxLimit,
      conversation: null,
    };
  const row = await participant(ctx, args.conversationId, actor);
  return {
    inbox,
    hasMore: rows.length > args.inboxLimit,
    conversation: {
      ...summary(row, actor),
      ...(await connection(ctx, row)),
      ...(await history(ctx, row._id)),
      peerReadSequence:
        actor.role === "requester"
          ? row.developerReadSequence
          : row.requesterReadSequence,
    },
  };
}

export const older = internalQuery({
  args: { sessionId, conversationId, before: v.number() },
  handler: async (ctx, args) => {
    const actor = await access(ctx, args.sessionId, ["requester", "developer"]);
    const row = await participant(ctx, args.conversationId, actor);
    if (!Number.isSafeInteger(args.before) || args.before < 1)
      fail(400, "Invalid message cursor");
    return history(ctx, row._id, args.before);
  },
});

export const send = internalMutation({
  args: { sessionId, conversationId, clientId: v.string(), body: v.string() },
  handler: async (ctx, args) => {
    const actor = await access(ctx, args.sessionId, ["requester", "developer"]);
    const row = await participant(ctx, args.conversationId, actor);
    const input = chatMessageSchema.parse({
      clientId: args.clientId,
      body: args.body,
    });
    const existing = await ctx.db
      .query("messages")
      .withIndex("by_submission", (q) =>
        q
          .eq("conversationId", row._id)
          .eq("senderId", actor.user.id)
          .eq("clientId", input.clientId),
      )
      .unique();
    if (existing) {
      if (existing.body !== input.body)
        fail(409, "This message was already sent with different text");
      return message(existing);
    }
    if (!(await connection(ctx, row)).canSend)
      fail(
        409,
        "Messaging is paused because this connection is no longer mutual",
      );
    const sentAt = Date.now();
    const sequence = row.lastSequence + 1;
    const id = await ctx.db.insert("messages", {
      conversationId: row._id,
      senderId: actor.user.id,
      ...input,
      sequence,
      sentAt,
    });
    await ctx.db.patch(row._id, {
      lastSequence: sequence,
      lastMessage: input.body.slice(0, 160),
      updatedAt: sentAt,
      ...(actor.role === "requester"
        ? { requesterReadSequence: sequence }
        : { developerReadSequence: sequence }),
    });
    return { id, senderId: actor.user.id, ...input, sequence, sentAt };
  },
});

export const markRead = internalMutation({
  args: { sessionId, conversationId, sequence: v.number() },
  handler: async (ctx, args) => {
    const actor = await access(ctx, args.sessionId, ["requester", "developer"]);
    const row = await participant(ctx, args.conversationId, actor);
    const { sequence } = chatReadSchema.parse({ sequence: args.sequence });
    if (sequence > row.lastSequence)
      fail(400, "Only received messages can be marked read");
    const field =
      actor.role === "requester"
        ? "requesterReadSequence"
        : "developerReadSequence";
    if (sequence > row[field])
      await ctx.db.patch(row._id, { [field]: sequence });
    return { ok: true };
  },
});

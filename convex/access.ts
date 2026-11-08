import { ConvexError } from "convex/values";
import { authComponent } from "./auth";
import { components } from "./_generated/api";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Role } from "../backend/schemas";

export function fail(status: number, message: string): never {
  throw new ConvexError({ status, message });
}

/** Session IDs reach these internal functions only from the authenticated HTTP action. */
export async function optionalAccess(
  ctx: QueryCtx | MutationCtx,
  sessionId?: string,
) {
  if (!sessionId) return null;
  const session = await ctx.runQuery(components.betterAuth.adapter.findOne, {
    model: "session",
    where: [
      { field: "_id", value: sessionId },
      { field: "expiresAt", operator: "gt", value: Date.now() },
    ],
  });
  if (!session) return null;
  const user = await authComponent.getAnyUserById(ctx, session.userId);
  if (!user) return null;
  const member = await ctx.db
    .query("members")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .unique();
  const role: Role | null = member
    ? member.role === "developer"
      ? "developer"
      : "requester"
    : null;
  return {
    user: { id: user._id, name: user.name },
    role,
  };
}

export async function access(
  ctx: QueryCtx | MutationCtx,
  sessionId?: string,
  roles?: Role[],
) {
  const actor = await optionalAccess(ctx, sessionId);
  if (!actor) fail(401, "Sign in to continue");
  if (roles && (!actor.role || !roles.includes(actor.role)))
    fail(403, "This account role cannot perform that action");
  return actor;
}

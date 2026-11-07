import { ConvexError } from "convex/values";
import { authComponent } from "./auth";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Role } from "../backend/schemas";

export function fail(status: number, message: string): never {
  throw new ConvexError({ status, message });
}

export async function access(
  ctx: QueryCtx | MutationCtx,
  secret: string,
  roles?: Role[],
) {
  if (
    !process.env.CONVEX_BRIDGE_SECRET ||
    secret !== process.env.CONVEX_BRIDGE_SECRET
  ) {
    fail(403, "Only the application API can access this function");
  }
  const user = await authComponent.safeGetAuthUser(ctx);
  if (!user) fail(401, "Sign in to continue");
  const member = await ctx.db
    .query("members")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .unique();
  if (roles && (!member || !roles.includes(member.role))) {
    fail(403, "This account role cannot perform that action");
  }
  return {
    user: { id: user._id, name: user.name },
    role: member?.role ?? null,
  };
}

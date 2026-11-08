import { ConvexError } from "convex/values";
import { authComponent } from "./auth";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Role } from "../backend/schemas";

export function fail(status: number, message: string): never {
  throw new ConvexError({ status, message });
}

function requireBridge(secret: string) {
  if (
    !process.env.CONVEX_BRIDGE_SECRET ||
    secret !== process.env.CONVEX_BRIDGE_SECRET
  ) {
    fail(403, "Only the application API can access this function");
  }
}

/** Public reads still require the bridge; the signed-in user is optional. */
export async function optionalAccess(
  ctx: QueryCtx | MutationCtx,
  secret: string,
) {
  requireBridge(secret);
  if (!(await authComponent.safeGetAuthUser(ctx))) return null;
  return access(ctx, secret);
}

export async function access(
  ctx: QueryCtx | MutationCtx,
  secret: string,
  roles?: Role[],
) {
  requireBridge(secret);
  const user = await authComponent.safeGetAuthUser(ctx);
  if (!user) fail(401, "Sign in to continue");
  const member = await ctx.db
    .query("members")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .unique();
  const role: Role | null = member
    ? member.role === "developer"
      ? "developer"
      : "requester"
    : null;
  if (roles && (!role || !roles.includes(role))) {
    fail(403, "This account role cannot perform that action");
  }
  return {
    user: { id: user._id, name: user.name },
    role,
  };
}

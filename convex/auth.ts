import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth/minimal";
import { bearer } from "better-auth/plugins/bearer";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";

export const authComponent = createClient<DataModel>(components.betterAuth);

export function createAuth(ctx: GenericCtx<DataModel>) {
  const siteUrl = process.env.SITE_URL;
  if (!siteUrl || !process.env.BETTER_AUTH_SECRET) {
    throw new Error("Authentication is not configured");
  }
  const trustedOrigins = [
    siteUrl,
    process.env.CONVEX_SITE_URL,
    process.env.DEV_SITE_URL,
  ].filter((value): value is string => Boolean(value));
  return betterAuth({
    baseURL: siteUrl,
    secret: process.env.BETTER_AUTH_SECRET,
    database: authComponent.adapter(ctx),
    trustedOrigins,
    emailAndPassword: { enabled: true, minPasswordLength: 12 },
    rateLimit: {
      enabled: true,
      storage: "database",
      customRules: {
        "/convex/jwks": false,
        "/convex/.well-known/openid-configuration": false,
      },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        const origin = ctx.headers?.get("origin");
        if (origin && !trustedOrigins.includes(origin))
          throw new APIError("FORBIDDEN", { message: "Untrusted origin" });
        if (
          ctx.body &&
          new TextEncoder().encode(JSON.stringify(ctx.body)).length > 32 * 1024
        )
          throw new APIError("PAYLOAD_TOO_LARGE", {
            message: "Request body exceeds 32 KB",
          });
      }),
    },
    // Native sessions use signed bearer tokens; browsers retain cookie auth.
    plugins: [bearer({ requireSignature: true }), convex({ authConfig })],
  });
}

import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth/minimal";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";
import { socialProviders } from "./socialProviders";

export const authComponent = createClient<DataModel>(components.betterAuth);

export function createAuth(ctx: GenericCtx<DataModel>) {
  const siteUrl = process.env.SITE_URL;
  if (!siteUrl || !process.env.BETTER_AUTH_SECRET) {
    throw new Error("Authentication is not configured");
  }
  return betterAuth({
    baseURL: siteUrl,
    secret: process.env.BETTER_AUTH_SECRET,
    database: authComponent.adapter(ctx),
    trustedOrigins: [
      siteUrl,
      ...(process.env.DEV_SITE_URL ? [process.env.DEV_SITE_URL] : []),
    ],
    emailAndPassword: { enabled: true, minPasswordLength: 12 },
    // Google and GitHub appear only when their credentials are set on the
    // deployment. Account linking keeps Better Auth's safe default: an existing
    // unverified email/password account is never linked silently.
    socialProviders: socialProviders(process.env),
    account: { encryptOAuthTokens: true },
    rateLimit: {
      enabled: true,
      storage: "database",
      customRules: {
        "/convex/jwks": false,
        "/convex/.well-known/openid-configuration": false,
      },
    },
    advanced: { ipAddress: { ipAddressHeaders: ["x-buildandconnect-ip"] } },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (
          ["/convex/jwks", "/convex/.well-known/openid-configuration"].includes(
            ctx.path,
          )
        )
          return;
        if (
          !process.env.CONVEX_BRIDGE_SECRET ||
          ctx.headers?.get("x-buildandconnect-bridge") !==
            process.env.CONVEX_BRIDGE_SECRET
        ) {
          throw new APIError("FORBIDDEN", {
            message: "Use the application authentication endpoint",
          });
        }
      }),
    },
    plugins: [convex({ authConfig })],
  });
}

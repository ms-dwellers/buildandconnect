import { betterAuth } from "better-auth";
import type { BackendEnv } from "./env.ts";

export function createAuth(env: BackendEnv) {
  if (
    !env.BETTER_AUTH_SECRET ||
    env.BETTER_AUTH_SECRET.length < 32 ||
    !env.SITE_URL
  ) {
    throw new Error("Authentication configuration missing");
  }
  return betterAuth({
    database: env.DB,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.SITE_URL,
    trustedOrigins: [env.SITE_URL],
    emailAndPassword: { enabled: true, minPasswordLength: 12 },
    rateLimit: { enabled: true, storage: "database" },
    advanced: {
      database: { generateId: () => crypto.randomUUID() },
      ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] },
    },
  });
}

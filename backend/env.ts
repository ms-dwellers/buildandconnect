import type { env } from "cloudflare:workers";

export type BackendEnv = {
  VITE_CONVEX_URL: string;
  VITE_CONVEX_SITE_URL: string;
  CONVEX_BRIDGE_SECRET: string;
  SITE_URL: string;
} & Partial<Pick<typeof env, "AI">>;

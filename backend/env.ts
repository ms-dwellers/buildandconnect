import type { env } from "cloudflare:workers";

export type BackendEnv = {
  VITE_CONVEX_URL: string;
  VITE_CONVEX_SITE_URL: string;
  CONVEX_BRIDGE_SECRET: string;
  SITE_URL: string;
  OPENROUTER_API_KEY?: string;
  OPENROUTER_MODEL?: string;
  ELEVENLABS_API_KEY?: string;
  ELEVENLABS_STT_MODEL?: string;
} & Partial<Pick<typeof env, "AI">>;

import type { env } from "cloudflare:workers";

export type BackendEnv = Pick<
  typeof env,
  "DB" | "BETTER_AUTH_SECRET" | "SITE_URL"
> &
  Partial<Pick<typeof env, "AI">>;

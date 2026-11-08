/**
 * Social sign-in providers are enabled only when both of their credentials
 * exist in the Convex deployment environment, so deployments without them keep
 * working with email and password alone. Credentials never reach the Worker or
 * the browser; `configuredProviders` exposes booleans only.
 */
export const PROVIDER_IDS = ["google", "github"] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

export const PROVIDER_VARIABLES: Record<ProviderId, readonly [string, string]> =
  {
    google: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    github: ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"],
  };

type Environment = Record<string, string | undefined>;

function credentials(env: Environment, id: ProviderId) {
  const [idName, secretName] = PROVIDER_VARIABLES[id];
  const clientId = env[idName]?.trim();
  const clientSecret = env[secretName]?.trim();
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

export function configuredProviders(
  env: Environment,
): Record<ProviderId, boolean> {
  return {
    google: credentials(env, "google") !== null,
    github: credentials(env, "github") !== null,
  };
}

/** Better Auth `socialProviders` option, with unconfigured providers omitted. */
export function socialProviders(env: Environment) {
  const providers: {
    google?: {
      clientId: string;
      clientSecret: string;
      prompt: "select_account";
    };
    github?: { clientId: string; clientSecret: string };
  } = {};
  const google = credentials(env, "google");
  if (google) providers.google = { ...google, prompt: "select_account" };
  const github = credentials(env, "github");
  if (github) providers.github = github;
  return providers;
}

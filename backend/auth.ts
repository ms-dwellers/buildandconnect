import { ConvexHttpClient } from "convex/browser";
import { HTTPException } from "hono/http-exception";
import type { BackendEnv } from "./env";

export function isConfigured(env: BackendEnv) {
  return Boolean(
    env.VITE_CONVEX_URL &&
    env.VITE_CONVEX_SITE_URL &&
    env.SITE_URL &&
    env.CONVEX_BRIDGE_SECRET,
  );
}

async function sessionToken(env: BackendEnv, request: Request) {
  if (!request.headers.get("cookie")) return null;
  let response: Response;
  let data: unknown;
  try {
    // Exchange the current session, not a JWT left behind by an older sign-in.
    response = await proxyAuth(
      env,
      new Request(new URL("/api/auth/convex/token", env.SITE_URL), {
        headers: request.headers,
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(10_000)]),
      }),
    );
    if (response.status === 401) return null;
    if (response.status === 429)
      throw new HTTPException(429, {
        message: "Too many requests. Wait a moment and retry.",
      });
    if (!response.ok) throw new Error("Token exchange failed");
    data = await response.json();
  } catch (error) {
    if (error instanceof HTTPException) throw error;
    throw new HTTPException(503, {
      message:
        "Sign-in could not be verified. Your session may still be active; retry shortly.",
    });
  }
  if (
    typeof data !== "object" ||
    data === null ||
    !("token" in data) ||
    typeof data.token !== "string" ||
    !data.token
  )
    throw new HTTPException(503, {
      message: "Sign-in could not be verified. Retry shortly.",
    });
  return data.token;
}

export async function createAuthenticatedClient(
  env: BackendEnv,
  request: Request,
) {
  const token = await sessionToken(env, request);
  if (!token) throw new HTTPException(401, { message: "Sign in to continue" });
  const client = new ConvexHttpClient(env.VITE_CONVEX_URL);
  client.setAuth(token);
  return client;
}

/** For public reads: attach the session when there is one, otherwise none. */
export async function createOptionalClient(env: BackendEnv, request: Request) {
  const client = new ConvexHttpClient(env.VITE_CONVEX_URL);
  if (request.headers.get("cookie")) {
    const token = await sessionToken(env, request);
    if (token) client.setAuth(token);
  }
  return client;
}

export async function proxyAuth(env: BackendEnv, request: Request) {
  const url = new URL(request.url);
  const site = new URL(env.SITE_URL);
  const headers = new Headers(request.headers);
  headers.set("x-buildandconnect-bridge", env.CONVEX_BRIDGE_SECRET);
  headers.set(
    "x-buildandconnect-ip",
    request.headers.get("cf-connecting-ip") ?? "127.0.0.1",
  );
  for (const name of [
    "transfer-encoding",
    "content-length",
    "connection",
    "x-forwarded-host",
    "x-forwarded-proto",
  ])
    headers.delete(name);
  headers.set("host", new URL(env.VITE_CONVEX_SITE_URL).host);
  headers.set("x-better-auth-forwarded-host", site.host);
  headers.set("x-better-auth-forwarded-proto", site.protocol.replace(":", ""));
  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
    signal: request.signal,
  };
  if (request.method !== "GET" && request.method !== "HEAD")
    init.body = await request.arrayBuffer();
  return fetch(`${env.VITE_CONVEX_SITE_URL}${url.pathname}${url.search}`, init);
}

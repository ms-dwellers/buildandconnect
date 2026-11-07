import { getToken } from "@convex-dev/better-auth/utils";
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

export async function createAuthenticatedClient(
  env: BackendEnv,
  request: Request,
) {
  const headers = new Headers(request.headers);
  headers.set("x-buildandconnect-bridge", env.CONVEX_BRIDGE_SECRET);
  headers.set(
    "x-buildandconnect-ip",
    request.headers.get("cf-connecting-ip") ?? "127.0.0.1",
  );
  headers.delete("content-length");
  headers.delete("transfer-encoding");
  const { token } = await getToken(env.VITE_CONVEX_SITE_URL, headers, {
    jwtCache: {
      enabled: true,
      expirationToleranceSeconds: 0,
      isAuthError: () => false,
    },
  });
  if (!token) throw new HTTPException(401, { message: "Sign in to continue" });
  const client = new ConvexHttpClient(env.VITE_CONVEX_URL);
  client.setAuth(token);
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
  };
  if (request.method !== "GET" && request.method !== "HEAD")
    init.body = await request.arrayBuffer();
  return fetch(`${env.VITE_CONVEX_SITE_URL}${url.pathname}${url.search}`, init);
}

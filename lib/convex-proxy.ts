import { readRequestBody, RequestBodyTooLarge } from "../backend/http.ts";

/** The web host forwards requests only. Auth, validation, AI and data run in Convex. */
export async function forwardToConvex(
  request: Request,
  config: { VITE_CONVEX_SITE_URL?: string; SITE_URL?: string },
): Promise<Response> {
  if (!config.VITE_CONVEX_SITE_URL || !config.SITE_URL)
    return Response.json(
      { error: "Convex is not configured" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  const target = new URL(config.VITE_CONVEX_SITE_URL);
  const incoming = new URL(request.url);
  target.pathname = incoming.pathname;
  target.search = incoming.search;
  const headers = new Headers(request.headers);
  for (const name of [...headers.keys()]) {
    if (
      name.startsWith("x-forwarded-") ||
      name.startsWith("x-buildandconnect-") ||
      name.startsWith("x-better-auth-") ||
      [
        "host",
        "connection",
        "transfer-encoding",
        "content-length",
        "cf-connecting-ip",
      ].includes(name)
    )
      headers.delete(name);
  }
  const site = new URL(config.SITE_URL);
  headers.set("x-better-auth-forwarded-host", site.host);
  headers.set("x-better-auth-forwarded-proto", site.protocol.slice(0, -1));
  try {
    const result = await fetch(target, {
      method: request.method,
      headers,
      ...(["GET", "HEAD"].includes(request.method)
        ? {}
        : { body: await readRequestBody(request) }),
      redirect: "manual",
      signal: AbortSignal.timeout(60_000),
    });
    const responseHeaders = new Headers(result.headers);
    responseHeaders.set("Cache-Control", "no-store");
    return new Response(result.body, {
      status: result.status,
      headers: responseHeaders,
    });
  } catch (error) {
    if (error instanceof RequestBodyTooLarge)
      return Response.json(
        { error: "Request body exceeds 32 KB" },
        { status: 413, headers: { "Cache-Control": "no-store" } },
      );
    return Response.json(
      { error: "Convex is temporarily unreachable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

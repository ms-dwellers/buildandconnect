import { ConvexClient } from "convex/browser";
import { z } from "zod";
import { api } from "../convex/_generated/api";
import { forwardToConvex } from "./convex-proxy";

const bootstrapSchema = z.object({
  token: z.string().min(1),
  url: z.url(),
  expiresAt: z.number(),
});

/** A transport-only bridge: Convex owns authentication, subscriptions and data. */
export async function streamChat(
  request: Request,
  config: Parameters<typeof forwardToConvex>[1],
) {
  const url = new URL(request.url);
  const origin = request.headers.get("Origin");
  if (
    (origin && origin !== url.origin) ||
    request.headers.get("Sec-Fetch-Site") === "cross-site"
  )
    return new Response(null, { status: 403 });
  const conversationId = url.searchParams.get("conversation") ?? undefined;
  const inboxLimit = Number(url.searchParams.get("limit") ?? 20);
  if (
    (conversationId && !/^[a-z0-9]{20,64}$/.test(conversationId)) ||
    !Number.isInteger(inboxLimit) ||
    inboxLimit < 20 ||
    inboxLimit > 200
  )
    return new Response(null, { status: 400 });
  const bootstrapUrl = new URL("/api/chat/stream-session", url);
  const bootstrap = await forwardToConvex(
    new Request(bootstrapUrl, {
      headers: request.headers,
      signal: request.signal,
    }),
    config,
  );
  if (!bootstrap.ok) return bootstrap;
  const parsed = bootstrapSchema.safeParse(await bootstrap.json());
  if (!parsed.success)
    return Response.json(
      { error: "Live messages are not configured" },
      { status: 503 },
    );
  const session = parsed.data;
  const client = new ConvexClient(session.url, {
    logger: false,
    unsavedChangesWarning: false,
  });
  const encoder = new TextEncoder();
  let stopQuery: (() => void) | undefined;
  let stopConnection: (() => void) | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let expiry: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  let closeStream: (() => void) | undefined;

  async function stop() {
    if (stopped) return;
    stopped = true;
    clearInterval(heartbeat);
    clearTimeout(expiry);
    request.signal.removeEventListener("abort", abort);
    stopQuery?.();
    stopConnection?.();
    await client.close();
  }
  function abort() {
    closeStream?.();
    void stop();
  }
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      closeStream = () => {
        if (!stopped) controller.close();
      };
      function emit(event: string, value: unknown) {
        if (stopped) return;
        // Disconnect slow readers instead of accumulating private snapshots in memory.
        if ((controller.desiredSize ?? 0) <= 0) {
          abort();
          return;
        }
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(value)}\n\n`),
        );
      }
      client.setAuth(
        async () => session.token,
        (authenticated) => {
          if (!authenticated) {
            emit("unavailable", { message: "Sign in again to load messages." });
            abort();
          }
        },
      );
      stopQuery = client.onUpdate(
        api.chat.watch,
        {
          conversationId,
          inboxLimit,
        },
        (snapshot) => emit("snapshot", snapshot),
        () => {
          emit("unavailable", {
            message:
              "This conversation is unavailable. Sign in again or return to your inbox.",
          });
          abort();
        },
      );
      stopConnection = client.subscribeToConnectionState((state) => {
        emit("connection", { connected: state.isWebSocketConnected });
      });
      heartbeat = setInterval(
        () =>
          emit("connection", {
            connected: client.connectionState().isWebSocketConnected,
          }),
        15_000,
      );
      // Reconnect with fresh credentials, including when a live session expires.
      expiry = setTimeout(
        abort,
        Math.max(0, Math.min(5 * 60_000, session.expiresAt - Date.now())),
      );
      request.signal.addEventListener("abort", abort, { once: true });
      if (request.signal.aborted) abort();
    },
    cancel: stop,
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store, no-transform",
      "X-Content-Type-Options": "nosniff",
      "X-Accel-Buffering": "no",
    },
  });
}

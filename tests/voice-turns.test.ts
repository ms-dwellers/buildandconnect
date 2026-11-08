import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";
import { readRequestBody, RequestBodyTooLarge } from "../backend/http.ts";
import { emptyHiringBrief } from "../backend/hiring/schemas.ts";
import {
  voiceTurnRequest,
  voiceTurnRequestSchema,
  voiceTurnResponseSchema,
} from "../backend/hiring/voice-turn.ts";
import {
  DEFAULT_VOICE_ID,
  DEFAULT_SPEECH_MODEL,
} from "../backend/hiring/models.ts";
import { createHiringRoutes, type ApiEnv } from "../convex/hiring/routes.ts";
import { speakReply, HiringProviderError } from "../convex/hiring/providers.ts";
import { draftVoiceTurn } from "../convex/hiring/service.ts";

const brief = {
  ...emptyHiringBrief(),
  title: "Garden calendar",
  description: "Let neighbours book community garden workshops.",
};

test("turns retain prior facts while bounding recent context and UTF-8 bytes", () => {
  const history = Array.from({ length: 60 }, (_, index) => ({
    role: index % 2 ? ("assistant" as const) : ("user" as const),
    content: "🌱".repeat(1400),
  }));
  const input = voiceTurnRequest(history, "  Make it remote instead.  ", brief);
  assert.deepEqual(input.brief, brief);
  assert.ok(input.messages.length <= 24);
  assert.deepEqual(input.messages.at(-1), {
    role: "user",
    content: "Make it remote instead.",
  });
  assert.ok(
    new TextEncoder().encode(JSON.stringify(input)).byteLength <= 28000,
  );
  assert.equal(
    voiceTurnRequestSchema.safeParse({
      messages: [{ role: "assistant", content: "Ready?" }],
      brief,
    }).success,
    false,
  );
  assert.throws(() => voiceTurnRequest([], "x".repeat(3001), brief));
  assert.equal(
    voiceTurnResponseSchema.safeParse({
      brief,
      reply: "Review your project brief.",
      readyForReview: true,
    }).success,
    true,
  );
});

test("audio body limits are enforced for streaming bodies, not only reported length", async () => {
  const response = new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(40000));
        controller.close();
      },
    }),
  );
  assert.equal((await readRequestBody(response, 64000)).byteLength, 40000);
  const tooLarge = new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(40000));
        controller.close();
      },
    }),
  );
  await assert.rejects(readRequestBody(tooLarge), RequestBodyTooLarge);
});

test("recorded turns and spoken replies require a requester and validate fields before provider calls", async () => {
  let turns = 0;
  let speech = 0;
  for (const role of [null, "developer", "requester"] as const) {
    const app = new Hono<ApiEnv>();
    app.use("*", async (c, next) => {
      c.set("role", role);
      await next();
    });
    app.route(
      "/api/hiring",
      createHiringRoutes({
        draftVoiceTurn: async (_env, messages, previous) => {
          turns++;
          assert.equal(messages.at(-1)?.content, "An online calendar");
          assert.deepEqual(previous, brief);
          return {
            brief,
            reply: "What is your timeline?",
            readyForReview: false,
          };
        },
        speakReply: async (_env, text) => {
          speech++;
          assert.equal(text, "What is your timeline?");
          return new Uint8Array([73, 68, 51]).buffer;
        },
      }),
    );
    app.onError((error, c) => {
      if (error instanceof HTTPException)
        return c.json({ error: error.message }, error.status);
      if (error instanceof ZodError)
        return c.json({ error: "Invalid input" }, 400);
      throw error;
    });
    const send = (path: string, body: unknown) =>
      app.request(`/api/hiring/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    const response = await send("turn", {
      messages: [{ role: "user", content: "An online calendar" }],
      brief,
    });
    assert.equal(response.status, role === "requester" ? 200 : 403);
    const spoken = await send("speech", { text: "What is your timeline?" });
    assert.equal(spoken.status, role === "requester" ? 200 : 403);
    if (role === "requester") {
      assert.equal(spoken.headers.get("Content-Type"), "audio/mpeg");
      assert.equal(spoken.headers.get("Cache-Control"), "no-store");
      assert.equal(
        (await send("speech", { text: "x".repeat(1001) })).status,
        400,
      );
      assert.equal(
        (await send("speech", { text: "Hello", voiceId: "caller-controlled" }))
          .status,
        400,
      );
      assert.equal((await send("turn", { messages: [], brief })).status, 400);
    }
  }
  assert.equal(turns, 1);
  assert.equal(speech, 1);
});

test("one model response updates the brief and supplies the next question without claiming empty briefs are ready", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async (_url: unknown, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      const input = JSON.parse(body.messages[1].content);
      assert.deepEqual(input.previousBrief, brief);
      assert.match(body.messages[0].content, /one useful follow-up question/);
      assert.match(
        body.messages[0].content,
        /Only|only user statements|only user/,
      );
      return Response.json({
        choices: [
          {
            finish_reason: "stop",
            message: {
              content: JSON.stringify({
                brief: emptyHiringBrief(),
                reply: "What would you like to build?",
                readyForReview: true,
              }),
            },
          },
        ],
      });
    },
  );
  const result = await draftVoiceTurn(
    { FIREWORKS_API_KEY: "test-fireworks" },
    [{ role: "user", content: "Start over." }],
    brief,
  );
  assert.equal(result.readyForReview, false);
});

test("spoken replies use the server-owned ElevenLabs voice, bounded audio, and private credentials", async () => {
  const audio = await speakReply(
    { ELEVENLABS_API_KEY: "test-elevenlabs" },
    "What is your timeline?",
    async (url, init) => {
      assert.equal(
        String(url),
        `https://api.elevenlabs.io/v1/text-to-speech/${DEFAULT_VOICE_ID}?output_format=mp3_44100_128`,
      );
      assert.equal(
        new Headers(init?.headers).get("xi-api-key"),
        "test-elevenlabs",
      );
      assert.deepEqual(JSON.parse(String(init?.body)), {
        text: "What is your timeline?",
        model_id: DEFAULT_SPEECH_MODEL,
      });
      return new Response(new Uint8Array([73, 68, 51]), {
        headers: { "Content-Type": "audio/mpeg" },
      });
    },
  );
  assert.equal(audio.byteLength, 3);
  await assert.rejects(speakReply({}, "Hello"), HiringProviderError);
  await assert.rejects(
    speakReply(
      { ELEVENLABS_API_KEY: "test", ELEVENLABS_VOICE_ID: "../bad" },
      "Hello",
    ),
    /valid ElevenLabs voice/,
  );
  await assert.rejects(
    speakReply(
      { ELEVENLABS_API_KEY: "test" },
      "Hello",
      async () => new Response("upstream private details", { status: 429 }),
    ),
    (error) => {
      assert.ok(error instanceof HiringProviderError);
      assert.equal(error.status, 429);
      assert.doesNotMatch(error.message, /private details/);
      return true;
    },
  );
});

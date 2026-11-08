import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  fireworksJson,
  transcribeAudio,
  HiringProviderError,
  DEFAULT_ANALYSIS_MODEL,
  DEFAULT_SCRIBE_MODEL,
  signVoiceConversation,
} from "../convex/hiring/providers.ts";
import {
  confirmedBriefSchema,
  emptyHiringBrief,
  intakeResponseSchema,
} from "../backend/hiring/schemas.ts";
import {
  draftBrief,
  extractBrief,
  recommendDevelopers,
} from "../convex/hiring/service.ts";
import type { HiringEnv as BackendEnv } from "../convex/hiring/env.ts";
import type { PublicDeveloper } from "../lib/types.ts";

const env = {
  FIREWORKS_API_KEY: "test-fireworks",
  ELEVENLABS_API_KEY: "test-elevenlabs",
} as BackendEnv;

test("private voice sessions use a server-owned agent and hide upstream errors", async () => {
  const configured = { ...env, ELEVENLABS_AGENT_ID: "agent_test" };
  const signedUrl =
    "wss://api.elevenlabs.io/v1/convai/conversation?conversation_signature=test";
  assert.deepEqual(
    await signVoiceConversation(configured, async (url, init) => {
      assert.match(String(url), /agent_id=agent_test$/);
      assert.equal(
        new Headers(init?.headers).get("xi-api-key"),
        "test-elevenlabs",
      );
      return Response.json({ signed_url: signedUrl });
    }),
    { signedUrl },
  );
  await assert.rejects(signVoiceConversation(env), /not configured/);
  await assert.rejects(
    signVoiceConversation({ ...env, ELEVENLABS_AGENT_ID: "../bad" }),
    /valid ElevenLabs/,
  );
  for (const response of [
    Response.json({ signed_url: "wss://evil.example/path" }),
    Response.json({}),
    new Response("private details", { status: 429 }),
  ]) {
    await assert.rejects(
      signVoiceConversation(configured, async () => response),
      (error: unknown) => {
        assert.ok(error instanceof HiringProviderError);
        assert.doesNotMatch(error.message, /private details/);
        return true;
      },
    );
  }
});

test("background extraction has no spoken reply and retains previous facts as data", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async (_url: unknown, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      assert.match(
        body.messages[0].content,
        /silent background form-filling agent/,
      );
      assert.match(
        body.messages[0].content,
        /assistant questions and suggestions are not evidence/,
      );
      const input = JSON.parse(body.messages[1].content);
      assert.deepEqual(input.previousBrief, brief);
      return completion({ brief: { ...brief, workArrangement: "remote" } });
    },
  );
  const result = await extractBrief(
    env,
    [{ role: "user", content: "Actually, remote please." }],
    brief,
  );
  assert.equal(result.brief.workArrangement, "remote");
  assert.equal("reply" in result, false);
});

test("model settings and provider API keys live in Convex, not the Worker", () => {
  const config = readFileSync(
    new URL("../cloudflare.config.ts", import.meta.url),
    "utf8",
  );
  const example = readFileSync(
    new URL("../.env.example", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(config, /FIREWORKS|ELEVENLABS|WORKERS_AI/);
  for (const name of [
    "FIREWORKS_API_KEY",
    "FIREWORKS_MODEL",
    "ELEVENLABS_API_KEY",
    "ELEVENLABS_STT_MODEL",
  ])
    assert.match(example, new RegExp(`^# ${name}\\b`, "m"));
  assert.doesNotMatch(example, /^(FIREWORKS|ELEVENLABS)_[A-Z_]*=/m);
  assert.ok(
    DEFAULT_ANALYSIS_MODEL.length > 0 && DEFAULT_SCRIBE_MODEL.length > 0,
  );
});

test("Worker config keeps runtime modules out of Vite's denied config dependencies", () => {
  const config = readFileSync(
    new URL("../cloudflare.config.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(config, /from\s+["'][^"']*(backend|convex)\//);
});
const brief = {
  ...emptyHiringBrief(),
  title: "Community calendar",
  description: "Help older adults find local events.",
};
const intake = { brief, reply: "What is the budget?" };
const completion = (value: unknown) =>
  Response.json({
    choices: [
      { finish_reason: "stop", message: { content: JSON.stringify(value) } },
    ],
  });
const criteria = {
  technologies: ["react"],
  experienceYears: { preferredMin: 0, preferredMax: 3 },
  causes: ["digital inclusion"],
  communitiesServed: ["older adults"],
  learningOpportunities: [],
  practicalConsiderations: [],
};
const developer: PublicDeveloper = {
  id: "dev-one",
  name: "Not sent to model",
  bio: "I make community websites.",
  city: "Calgary",
  skills: [{ name: "react", level: 2 }],
  projects: [],
  interests: ["digital inclusion"],
  wantsToLearn: ["nodejs"],
  experienceLevel: 1,
  collaboration: "async",
  weeklyHours: 10,
  acceptsVolunteer: true,
  available: true,
  discoverable: true,
};

test("Fireworks uses strict JSON and server-side credentials", async () => {
  const request: typeof fetch = async (url, init) => {
    assert.equal(url, "https://api.fireworks.ai/inference/v1/chat/completions");
    assert.equal(
      new Headers(init?.headers).get("Authorization"),
      "Bearer test-fireworks",
    );
    const body = JSON.parse(String(init?.body));
    assert.equal(body.model, DEFAULT_ANALYSIS_MODEL);
    assert.equal(body.response_format.json_schema.strict, true);
    assert.equal(body.provider, undefined);
    assert.ok(init?.signal);
    return completion(intake);
  };
  assert.deepEqual(
    await fireworksJson(
      env,
      {
        name: "intake",
        schema: intakeResponseSchema,
        system: "test",
        input: {},
      },
      request,
    ),
    intake,
  );
});

test("missing keys, invalid Fireworks models and provider errors fail without exposing details", async () => {
  const options = {
    name: "intake",
    schema: intakeResponseSchema,
    system: "test",
    input: {},
  };
  let calls = 0;
  const request: typeof fetch = async () => {
    calls++;
    return completion(intake);
  };
  await assert.rejects(
    fireworksJson({} as BackendEnv, options, request),
    (error) => error instanceof HiringProviderError && error.status === 503,
  );
  await assert.rejects(
    fireworksJson({ ...env, FIREWORKS_MODEL: "other/model" }, options, request),
    HiringProviderError,
  );
  assert.equal(calls, 0);
  for (const status of [401, 429, 500]) {
    await assert.rejects(
      fireworksJson(
        env,
        options,
        async () => new Response("private upstream details", { status }),
      ),
      (error) => {
        assert.ok(error instanceof HiringProviderError);
        assert.ok(!error.message.includes("private"));
        assert.equal(error.status, status === 429 ? 429 : 502);
        return true;
      },
    );
  }
  await assert.rejects(
    fireworksJson(env, options, async () =>
      completion({ ...intake, invented: true }),
    ),
    HiringProviderError,
  );
  await assert.rejects(
    fireworksJson(env, options, async () =>
      Response.json({
        choices: [
          {
            finish_reason: "length",
            message: { content: JSON.stringify(intake) },
          },
        ],
      }),
    ),
    HiringProviderError,
  );
});

test("ElevenLabs receives only a bounded audio upload and returns transcript text", async () => {
  const audio = new Blob(["test audio"], { type: "audio/webm" });
  const request: typeof fetch = async (url, init) => {
    assert.equal(url, "https://api.elevenlabs.io/v1/speech-to-text");
    assert.equal(
      new Headers(init?.headers).get("xi-api-key"),
      "test-elevenlabs",
    );
    const form = init?.body as FormData;
    assert.equal(form.get("model_id"), "scribe_v2");
    assert.equal(form.get("diarize"), "false");
    assert.equal(form.get("tag_audio_events"), "false");
    assert.equal((form.get("file") as File).type, "audio/webm");
    return Response.json({ text: " I need a website. ", words: [] });
  };
  assert.deepEqual(await transcribeAudio(env, audio, request), {
    text: "I need a website.",
  });
  await assert.rejects(
    transcribeAudio({} as BackendEnv, audio, request),
    HiringProviderError,
  );
  await assert.rejects(
    transcribeAudio(env, audio, async () =>
      Response.json({ nope: "bad response" }),
    ),
    HiringProviderError,
  );
  await assert.rejects(
    transcribeAudio(env, audio, async () => {
      throw new Error("private network error");
    }),
    /Transcription was interrupted/,
  );
});

test("intake distinguishes user evidence and matching omits identity and unknown preferences", async (t) => {
  const calls: { messages: { content: string }[] }[] = [];
  const responses = [
    intake,
    criteria,
    {
      developers: [
        {
          developerId: developer.id,
          reason: "Relevant interests and React experience.",
          needsDiscussion: ["Confirm compensation"],
        },
      ],
    },
  ];
  t.mock.method(
    globalThis,
    "fetch",
    async (_url: unknown, init: RequestInit) => {
      calls.push(JSON.parse(String(init.body)));
      return completion(responses.shift());
    },
  );
  await draftBrief(env, [
    { role: "user", content: "Help older adults find local events." },
  ]);
  const result = await recommendDevelopers(env, brief, [developer]);
  assert.equal(result.developers[0].profile.name, developer.name);
  const prompt = calls[2].messages[0].content;
  assert.match(prompt, /NOT years/);
  assert.match(prompt, /never hire or reject/);
  const input = JSON.parse(calls[2].messages[1].content);
  assert.equal(input.candidates[0].name, undefined);
  assert.equal(input.candidates[0].professionalExperienceYears, null);
  assert.equal(input.candidates[0].compensationPreference, null);
  assert.deepEqual(input.candidates[0].wantsToLearn, ["nodejs"]);
});

test("Fireworks cannot invent or duplicate developer IDs", async (t) => {
  for (const ids of [["not-in-pool"], [developer.id, developer.id]]) {
    let call = 0;
    t.mock.method(globalThis, "fetch", async () =>
      completion(
        call++ === 0
          ? criteria
          : {
              developers: ids.map((developerId) => ({
                developerId,
                reason: "Example",
                needsDiscussion: [],
              })),
            },
      ),
    );
    await assert.rejects(
      recommendDevelopers(env, brief, [developer]),
      /invalid developer list/,
    );
    t.mock.restoreAll();
  }
});

test("Fireworks receives saved preferences and can recommend zero years outside the preferred experience range", async (t) => {
  const preferences = {
    professionalExperienceYears: 0,
    compensationPreference: {
      currency: "CAD",
      minimumHourlyRate: 20,
      preferredHourlyRate: 30,
    },
    workArrangementPreference: {
      preferred: "remote" as const,
      required: false,
    },
  };
  let candidateInput: { candidates: PublicDeveloper[] } | undefined;
  let calls = 0;
  t.mock.method(
    globalThis,
    "fetch",
    async (_url: unknown, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      if (calls++ === 0)
        return completion({
          ...criteria,
          experienceYears: { preferredMin: 1, preferredMax: 3 },
        });
      candidateInput = JSON.parse(body.messages[1].content);
      assert.match(body.messages[0].content, /zero is valid/);
      assert.match(body.messages[0].content, /soft preferences/);
      return completion({
        developers: [
          {
            developerId: developer.id,
            reason:
              "Relevant React work, social interests and compatible remote preference.",
            needsDiscussion: [],
          },
        ],
      });
    },
  );
  const experienced = {
    ...developer,
    id: "dev-three",
    professionalExperienceYears: 3,
  };
  const result = await recommendDevelopers(
    env,
    {
      ...brief,
      workArrangement: "remote",
      compensation: {
        kind: "paid",
        currency: "CAD",
        period: "hour",
        minimum: 20,
        maximum: 25,
      },
    },
    [{ ...developer, ...preferences }, experienced],
  );
  assert.ok(candidateInput);
  assert.equal(candidateInput.candidates.length, 2);
  assert.equal(candidateInput.candidates[0].professionalExperienceYears, 0);
  assert.deepEqual(
    candidateInput.candidates[0].compensationPreference,
    preferences.compensationPreference,
  );
  assert.deepEqual(
    candidateInput.candidates[0].workArrangementPreference,
    preferences.workArrangementPreference,
  );
  assert.equal(candidateInput.candidates[1].professionalExperienceYears, 3);
  assert.equal(result.developers[0].profile.professionalExperienceYears, 0);
});

test("confirmed briefs require reviewable content and valid compensation bounds", () => {
  assert.equal(confirmedBriefSchema.safeParse({ brief }).success, true);
  assert.equal(
    confirmedBriefSchema.safeParse({ brief: emptyHiringBrief() }).success,
    false,
  );
  assert.equal(
    confirmedBriefSchema.safeParse({
      brief: {
        ...brief,
        compensation: { ...brief.compensation, minimum: 50, maximum: 20 },
      },
    }).success,
    false,
  );
});

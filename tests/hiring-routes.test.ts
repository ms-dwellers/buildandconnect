import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";
import type { ApiEnv } from "../backend/api.ts";
import { createHiringRoutes } from "../backend/hiring/routes.ts";
import { emptyHiringBrief } from "../backend/hiring/schemas.ts";
import {
  HiringProviderError,
  MAX_AUDIO_BYTES,
} from "../backend/hiring/providers.ts";
import type { PublicDeveloper } from "../lib/types.ts";

const candidate: PublicDeveloper = {
  id: "one",
  name: "Example",
  bio: "I build community websites.",
  city: "Calgary",
  skills: [{ name: "react", level: 2 }],
  projects: [],
  interests: [],
  wantsToLearn: [],
  experienceLevel: 1,
  collaboration: "async",
  weeklyHours: 10,
  acceptsVolunteer: false,
  available: true,
  discoverable: true,
};
const brief = {
  ...emptyHiringBrief(),
  title: "A website",
  description: "A website for community events",
};

function harness(
  role: ApiEnv["Variables"]["role"] = "company",
  visibleAfter = true,
  initial: PublicDeveloper = candidate,
  changed: PublicDeveloper = initial,
) {
  const calls = {
    transcription: 0,
    drafting: 0,
    matching: 0,
    listing: 0,
    candidates: [] as PublicDeveloper[],
  };
  const app = new Hono<ApiEnv>();
  app.use("*", async (c, next) => {
    c.env = { CONVEX_BRIDGE_SECRET: "test-bridge" } as ApiEnv["Bindings"];
    c.set("role", role);
    await next();
  });
  app.route(
    "/api/hiring",
    createHiringRoutes({
      transcribeAudio: async (_env, audio) => {
        calls.transcription++;
        assert.ok(audio.size);
        return { text: "A website" };
      },
      draftBrief: async () => {
        calls.drafting++;
        return { brief, reply: "What is the budget?" };
      },
      recommendDevelopers: async (_env, _brief, developers) => {
        calls.matching++;
        calls.candidates = developers;
        return {
          criteria: {
            technologies: [],
            experienceYears: { preferredMin: 0, preferredMax: 3 },
            causes: [],
            communitiesServed: [],
            learningOpportunities: [],
            practicalConsiderations: [],
          },
          developers: developers.map((profile) => ({
            developerId: profile.id,
            profile,
            reason: "Relevant interests",
            needsDiscussion: [],
          })),
        };
      },
      listDevelopers: async () => {
        calls.listing++;
        return calls.listing > 1 ? (visibleAfter ? [changed] : []) : [initial];
      },
    }),
  );
  app.onError((error, c) => {
    if (error instanceof HTTPException)
      return c.json({ error: error.message }, error.status);
    if (error instanceof ZodError)
      return c.json({ error: "Invalid fields" }, 400);
    if (error instanceof HiringProviderError)
      return c.json({ error: error.message }, error.status);
    throw error;
  });
  return { app, calls };
}

test("only company accounts can use paid hiring providers", async () => {
  for (const role of [null, "developer", "requester", "recruiter"] as const) {
    const { app, calls } = harness(role);
    const response = await app.request("/api/hiring/transcribe", {
      method: "POST",
      headers: { "Content-Type": "audio/webm" },
      body: "audio",
    });
    assert.equal(response.status, 403);
    assert.equal(calls.transcription, 0);
  }
});

test("transcription rejects wrong content types, empty and oversized recordings", async () => {
  const { app, calls } = harness();
  for (const [type, body, status] of [
    ["text/plain", "audio", 415],
    ["audio/webm", "", 400],
    ["audio/webm", new Uint8Array(MAX_AUDIO_BYTES + 1), 413],
  ] as const) {
    assert.equal(
      (
        await app.request("/api/hiring/transcribe", {
          method: "POST",
          headers: { "Content-Type": type },
          body,
        })
      ).status,
      status,
    );
  }
  assert.equal(calls.transcription, 0);
  assert.equal(
    (
      await app.request("/api/hiring/transcribe", {
        method: "POST",
        headers: { "Content-Type": "audio/webm;codecs=opus" },
        body: "audio",
      })
    ).status,
    200,
  );
  assert.equal(calls.transcription, 1);
});

test("drafting and recommendations are separate explicit requests", async () => {
  const { app, calls } = harness();
  assert.equal(
    (
      await app.request("/api/hiring/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "I need a website" }],
        }),
      })
    ).status,
    200,
  );
  assert.equal(calls.drafting, 1);
  assert.equal(calls.matching, 0);
  assert.equal(
    (
      await app.request("/api/hiring/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief: emptyHiringBrief() }),
      })
    ).status,
    400,
  );
  assert.equal(calls.matching, 0);
  const response = await app.request("/api/hiring/matches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ brief }),
  });
  assert.equal(response.status, 200);
  const result = (await response.json()) as {
    developers: { developerId: string }[];
  };
  assert.equal(result.developers[0].developerId, candidate.id);
});

test("withdrawn discovery consent removes a candidate before the response", async () => {
  const { app } = harness("company", false);
  const response = await app.request("/api/hiring/matches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ brief }),
  });
  const result = (await response.json()) as { developers: unknown[] };
  assert.deepEqual(result.developers, []);
});

test("paid-only developers are never sent for confirmed volunteer work", async () => {
  const { app, calls } = harness();
  const response = await app.request("/api/hiring/matches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      brief: {
        ...brief,
        compensation: { ...brief.compensation, kind: "volunteer" },
      },
    }),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(calls.candidates, []);
});

test("matching uses saved zero-year preferences and rechecks changed boundaries after inference", async () => {
  const initial: PublicDeveloper = {
    ...candidate,
    professionalExperienceYears: 0,
    compensationPreference: {
      currency: "CAD",
      minimumHourlyRate: 20,
      preferredHourlyRate: 30,
    },
    workArrangementPreference: { preferred: "remote", required: true },
  };
  const changed: PublicDeveloper = {
    ...initial,
    workArrangementPreference: { preferred: "onsite", required: true },
  };
  const { app, calls } = harness("company", true, initial, changed);
  const response = await app.request("/api/hiring/matches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      brief: {
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
    }),
  });
  assert.equal(response.status, 200);
  assert.equal(calls.candidates.length, 1);
  assert.equal(calls.candidates[0].professionalExperienceYears, 0);
  const result = (await response.json()) as { developers: unknown[] };
  assert.deepEqual(result.developers, []);
});

test("posting draft preparation requires a company and makes no model or candidate requests", async () => {
  const { app, calls } = harness();
  const path = "/api/hiring/posting-draft";
  const input = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ brief }),
  };
  const response = await app.request(path, input);
  assert.equal(response.status, 200);
  const result = (await response.json()) as {
    draft: { title: string };
    requiresConfirmation: boolean;
  };
  assert.equal(result.draft.title, brief.title);
  assert.equal(result.requiresConfirmation, true);
  assert.deepEqual(calls, {
    transcription: 0,
    drafting: 0,
    matching: 0,
    listing: 0,
    candidates: [],
  });
  assert.equal(
    (
      await app.request(path, {
        ...input,
        body: JSON.stringify({ brief: emptyHiringBrief() }),
      })
    ).status,
    400,
  );
  assert.equal(
    (await harness("developer").app.request(path, input)).status,
    403,
  );
});

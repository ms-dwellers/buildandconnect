import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { HTTPException } from "hono/http-exception";
import type { ConvexHttpClient } from "convex/browser";
import { api as convex } from "../../convex/_generated/api.js";
import type { PublicDeveloper } from "../../lib/types";
import type { ApiEnv } from "../api";
import {
  AUDIO_TYPES,
  MAX_AUDIO_BYTES,
  HiringProviderError,
  transcribeAudio,
} from "./providers.ts";
import { confirmedBriefSchema, conversationSchema } from "./schemas.ts";
import { draftBrief, recommendDevelopers } from "./service.ts";
import { hiringEligibility } from "./eligibility.ts";

export async function listHiringDevelopers(
  client: ConvexHttpClient,
  secret: string,
) {
  const developers: PublicDeveloper[] = [];
  let after = "";
  for (;;) {
    const result = await client.query(convex.data.developers, {
      secret,
      after,
      limit: 100,
    });
    developers.push(...result.data);
    if (
      developers.length > 200 ||
      (developers.length === 200 && result.nextCursor)
    )
      throw new HiringProviderError(
        "There are too many profiles for one matching request. Narrowed matching is needed before continuing.",
        503,
      );
    if (!result.nextCursor)
      return developers.filter(
        (developer) => developer.available && developer.discoverable,
      );
    if (result.nextCursor === after)
      throw new HiringProviderError(
        "The developer list could not be loaded. Try again.",
      );
    after = result.nextCursor;
  }
}

type HiringServices = {
  draftBrief: typeof draftBrief;
  recommendDevelopers: typeof recommendDevelopers;
  transcribeAudio: typeof transcribeAudio;
  listDevelopers: typeof listHiringDevelopers;
};

export function createHiringRoutes(
  services: HiringServices = {
    draftBrief,
    recommendDevelopers,
    transcribeAudio,
    listDevelopers: listHiringDevelopers,
  },
) {
  const routes = new Hono<ApiEnv>();
  routes.use("*", async (c, next) => {
    if (c.get("role") !== "company")
      throw new HTTPException(403, {
        message: "Employer voice intake requires a company account",
      });
    await next();
  });
  routes.get("/status", (c) =>
    c.json({
      transcription: Boolean(c.env.ELEVENLABS_API_KEY),
      matching: Boolean(c.env.OPENROUTER_API_KEY),
    }),
  );
  routes.post(
    "/transcribe",
    bodyLimit({
      maxSize: MAX_AUDIO_BYTES,
      onError: (c) =>
        c.json({ error: "Record a shorter answer (maximum 2 MB)" }, 413),
    }),
    async (c) => {
      const mimeType = c.req
        .header("Content-Type")
        ?.split(";")[0]
        .trim()
        .toLowerCase();
      if (!mimeType || !AUDIO_TYPES.includes(mimeType))
        throw new HTTPException(415, {
          message: "Use a supported audio recording",
        });
      const buffer = await c.req.arrayBuffer();
      if (!buffer.byteLength)
        throw new HTTPException(400, {
          message: "The recording is empty. Try again.",
        });
      return c.json(
        await services.transcribeAudio(
          c.env,
          new Blob([buffer], { type: mimeType }),
        ),
      );
    },
  );
  routes.post("/brief", async (c) => {
    const { messages } = conversationSchema.parse(await c.req.json());
    return c.json(await services.draftBrief(c.env, messages));
  });
  routes.post("/matches", async (c) => {
    const { brief } = confirmedBriefSchema.parse(await c.req.json());
    const pool = await services.listDevelopers(
      c.get("client"),
      c.env.CONVEX_BRIDGE_SECRET,
    );
    const candidates = pool.filter(
      (developer) => hiringEligibility(brief, developer).length === 0,
    );
    const result = await services.recommendDevelopers(c.env, brief, candidates);
    // Discovery consent can change while the model request is in flight.
    const current = new Map(
      (
        await services.listDevelopers(
          c.get("client"),
          c.env.CONVEX_BRIDGE_SECRET,
        )
      ).map((developer) => [developer.id, developer]),
    );
    return c.json({
      ...result,
      considered: candidates.length,
      developers: result.developers.flatMap((recommendation) => {
        const profile = current.get(recommendation.developerId);
        return profile && hiringEligibility(brief, profile).length === 0
          ? [{ ...recommendation, profile }]
          : [];
      }),
    });
  });
  return routes;
}

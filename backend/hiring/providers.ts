import { z } from "zod";
import type { BackendEnv } from "../env";

export const DEFAULT_GEMINI_MODEL = "google/gemini-3.8-flash";
export const DEFAULT_SCRIBE_MODEL = "scribe_v2";
export const MAX_AUDIO_BYTES = 2 * 1024 * 1024;
export const AUDIO_TYPES = [
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/wav",
  "audio/mpeg",
];

export class HiringProviderError extends Error {
  readonly status: 429 | 502 | 503;
  constructor(message: string, status: 429 | 502 | 503 = 502) {
    super(message);
    this.status = status;
  }
}

export async function geminiJson<T>(
  env: BackendEnv,
  options: {
    name: string;
    schema: z.ZodType<T>;
    system: string;
    input: unknown;
    maxTokens?: number;
  },
  request: typeof fetch = fetch,
) {
  if (!env.OPENROUTER_API_KEY)
    throw new HiringProviderError("Gemini is not configured yet.", 503);
  const model = env.OPENROUTER_MODEL || DEFAULT_GEMINI_MODEL;
  if (
    !model.startsWith("google/gemini-") ||
    model.includes(":") ||
    model.includes("image")
  )
    throw new HiringProviderError(
      "Configure a Gemini text model for matching.",
      503,
    );
  try {
    const response = await request(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: options.system },
            { role: "user", content: JSON.stringify(options.input) },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: options.name,
              strict: true,
              schema: z.toJSONSchema(options.schema, { io: "input" }),
            },
          },
          provider: { require_parameters: true, data_collection: "deny" },
          temperature: 0.2,
          max_tokens: options.maxTokens ?? 3000,
          stream: false,
        }),
        signal: AbortSignal.timeout(45_000),
      },
    );
    if (!response.ok) {
      await response.body?.cancel();
      throw new HiringProviderError(
        response.status === 429
          ? "Gemini is busy. Try again shortly."
          : "Gemini could not complete this request. Try again.",
        response.status === 429 ? 429 : 502,
      );
    }
    const result = z
      .object({
        choices: z
          .array(
            z.object({
              finish_reason: z.string().nullable(),
              message: z.object({ content: z.string() }),
            }),
          )
          .min(1),
      })
      .parse(await response.json());
    if (result.choices[0].finish_reason !== "stop")
      throw new Error("Incomplete output");
    return options.schema.parse(JSON.parse(result.choices[0].message.content));
  } catch (error) {
    if (error instanceof HiringProviderError) throw error;
    throw new HiringProviderError(
      "Gemini returned an incomplete response. Your draft has not changed; try again.",
    );
  }
}

export async function transcribeAudio(
  env: BackendEnv,
  audio: Blob,
  request: typeof fetch = fetch,
) {
  if (!env.ELEVENLABS_API_KEY)
    throw new HiringProviderError(
      "ElevenLabs transcription is not configured yet.",
      503,
    );
  const form = new FormData();
  form.append("file", audio, "speech");
  form.append("model_id", env.ELEVENLABS_STT_MODEL || DEFAULT_SCRIBE_MODEL);
  form.append("tag_audio_events", "false");
  form.append("diarize", "false");
  try {
    const response = await request(
      "https://api.elevenlabs.io/v1/speech-to-text",
      {
        method: "POST",
        headers: { "xi-api-key": env.ELEVENLABS_API_KEY },
        body: form,
        signal: AbortSignal.timeout(45_000),
      },
    );
    if (!response.ok) {
      await response.body?.cancel();
      throw new HiringProviderError(
        response.status === 429
          ? "Transcription is busy. Try again shortly."
          : "The recording could not be transcribed. Try again or type your answer.",
        response.status === 429 ? 429 : 502,
      );
    }
    return z
      .object({ text: z.string().trim().max(6000) })
      .parse(await response.json());
  } catch (error) {
    if (error instanceof HiringProviderError) throw error;
    throw new HiringProviderError(
      "Transcription was interrupted. Try again or type your answer.",
    );
  }
}

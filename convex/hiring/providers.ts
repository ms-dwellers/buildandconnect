import { z } from "zod";
import type { HiringEnv } from "./env";
import { readRequestBody } from "../../backend/http.ts";
import { MAX_RECORDING_BYTES } from "../../lib/voice-recording.ts";

import {
  DEFAULT_ANALYSIS_MODEL,
  DEFAULT_SCRIBE_MODEL,
  DEFAULT_SPEECH_MODEL,
  DEFAULT_VOICE_ID,
} from "../../backend/hiring/models.ts";
export {
  DEFAULT_ANALYSIS_MODEL,
  DEFAULT_SCRIBE_MODEL,
} from "../../backend/hiring/models.ts";
export const MAX_AUDIO_BYTES = MAX_RECORDING_BYTES;
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

export async function fireworksJson<T>(
  env: HiringEnv,
  options: {
    name: string;
    schema: z.ZodType<T>;
    system: string;
    input: unknown;
    maxTokens?: number;
    signal?: AbortSignal;
  },
  request: typeof fetch = fetch,
) {
  if (!env.FIREWORKS_API_KEY)
    throw new HiringProviderError("Fireworks is not configured yet.", 503);
  const model = env.FIREWORKS_MODEL || DEFAULT_ANALYSIS_MODEL;
  if (!/^accounts\/[a-z0-9-]+\/models\/[a-z0-9_.-]+$/.test(model))
    throw new HiringProviderError(
      "Configure a Fireworks text model for matching.",
      503,
    );
  try {
    const response = await request(
      "https://api.fireworks.ai/inference/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.FIREWORKS_API_KEY}`,
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
          temperature: 0.2,
          max_tokens: options.maxTokens ?? 3000,
          stream: false,
        }),
        signal: options.signal
          ? AbortSignal.any([options.signal, AbortSignal.timeout(45_000)])
          : AbortSignal.timeout(45_000),
      },
    );
    if (!response.ok) {
      await response.body?.cancel();
      throw new HiringProviderError(
        response.status === 429
          ? "Fireworks is busy. Try again shortly."
          : "Fireworks could not complete this request. Try again.",
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
      "Fireworks returned an incomplete response. Your draft has not changed; try again.",
    );
  }
}

export async function transcribeAudio(
  env: HiringEnv,
  audio: Blob,
  request: typeof fetch = fetch,
  signal?: AbortSignal,
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
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(45_000)])
          : AbortSignal.timeout(45_000),
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

export async function speakReply(
  env: HiringEnv,
  text: string,
  request: typeof fetch = fetch,
  signal?: AbortSignal,
) {
  if (!env.ELEVENLABS_API_KEY)
    throw new HiringProviderError(
      "Spoken replies are not configured. You can read the reply instead.",
      503,
    );
  const voiceId = env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;
  if (!/^[a-zA-Z0-9]{10,80}$/.test(voiceId))
    throw new HiringProviderError("Configure a valid ElevenLabs voice.", 503);
  try {
    const response = await request(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": env.ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({ text, model_id: DEFAULT_SPEECH_MODEL }),
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(30_000)])
          : AbortSignal.timeout(30_000),
      },
    );
    if (!response.ok) {
      await response.body?.cancel();
      throw new HiringProviderError(
        "The spoken reply is unavailable. You can read the reply or retry playback.",
        response.status === 429 ? 429 : 502,
      );
    }
    if (!response.headers.get("Content-Type")?.startsWith("audio/")) {
      await response.body?.cancel();
      throw new Error("Invalid speech response");
    }
    const audio = await readRequestBody(response, MAX_AUDIO_BYTES);
    if (!audio.byteLength) throw new Error("Empty speech response");
    return audio;
  } catch (error) {
    if (error instanceof HiringProviderError) throw error;
    throw new HiringProviderError(
      "The spoken reply was interrupted. You can read the reply or retry playback.",
    );
  }
}

export async function signVoiceConversation(
  env: HiringEnv,
  request: typeof fetch = fetch,
  signal?: AbortSignal,
) {
  return voiceCredential(
    env,
    "get-signed-url",
    (value) => {
      const result = z
        .object({ signed_url: z.string().max(4000).url() })
        .parse(value);
      const url = new URL(result.signed_url);
      if (
        url.protocol !== "wss:" ||
        url.hostname !== "api.elevenlabs.io" ||
        url.pathname !== "/v1/convai/conversation"
      )
        throw new Error("Invalid voice connection URL");
      return { signedUrl: result.signed_url };
    },
    request,
    signal,
  );
}

export async function nativeVoiceToken(
  env: HiringEnv,
  request: typeof fetch = fetch,
  signal?: AbortSignal,
) {
  return voiceCredential(
    env,
    "token",
    (value) => {
      const result = z
        .object({ token: z.string().min(1).max(16000) })
        .parse(value);
      return { token: result.token };
    },
    request,
    signal,
  );
}

async function voiceCredential<T>(
  env: HiringEnv,
  endpoint: "token" | "get-signed-url",
  parse: (value: unknown) => T,
  request: typeof fetch,
  signal?: AbortSignal,
): Promise<T> {
  if (!env.ELEVENLABS_API_KEY || !env.ELEVENLABS_AGENT_ID)
    throw new HiringProviderError(
      "The voice agent is not configured yet.",
      503,
    );
  if (!/^agent_[a-zA-Z0-9]+$/.test(env.ELEVENLABS_AGENT_ID))
    throw new HiringProviderError("Configure a valid ElevenLabs agent.", 503);
  try {
    const response = await request(
      `https://api.elevenlabs.io/v1/convai/conversation/${endpoint}?agent_id=${env.ELEVENLABS_AGENT_ID}`,
      {
        headers: {
          "xi-api-key": env.ELEVENLABS_API_KEY,
        },
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(15_000)])
          : AbortSignal.timeout(15_000),
      },
    );
    if (!response.ok) {
      await response.body?.cancel();
      throw new HiringProviderError(
        response.status === 429
          ? "The voice agent is busy. Try again shortly."
          : "The voice agent could not connect. Try again.",
        response.status === 429 ? 429 : 502,
      );
    }
    return parse(await response.json());
  } catch (error) {
    if (error instanceof HiringProviderError) throw error;
    throw new HiringProviderError(
      "The voice connection was interrupted. Try again.",
    );
  }
}

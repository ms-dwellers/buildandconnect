import { z } from "zod";
import { AnalysisUnavailable, type AIService } from "../backend/ai.ts";
import { ANALYSIS_MODEL, EMBEDDING_MODEL } from "../backend/models.ts";
import { vectorSchema } from "../backend/schemas.ts";

const chatResponse = z.object({
  choices: z
    .array(
      z.object({
        finish_reason: z.literal("stop"),
        message: z.object({ content: z.string().min(1) }),
      }),
    )
    .min(1),
});
const embeddingResponse = z.object({
  data: z
    .array(z.object({ index: z.literal(0), embedding: vectorSchema }))
    .length(1),
});

/** Credentials and provider requests stay in Convex, never in the web Worker. */
export function fireworksAI(): AIService | undefined {
  const token = process.env.FIREWORKS_API_KEY;
  if (!token) return undefined;
  return {
    async run(model, input, options) {
      try {
        const embedding = model === EMBEDDING_MODEL;
        if (!embedding && model !== ANALYSIS_MODEL)
          throw new Error("Unsupported analysis model");
        const format = embedding
          ? undefined
          : z
              .object({
                type: z.literal("json_schema"),
                json_schema: z.record(z.string(), z.unknown()),
              })
              .parse(input.response_format);
        const payload = {
          ...input,
          model,
          ...(format
            ? {
                stream: false,
                response_format: {
                  type: "json_schema",
                  json_schema: {
                    name: "analysis",
                    strict: true,
                    schema: format.json_schema,
                  },
                },
              }
            : {}),
        };
        const response = await fetch(
          `https://api.fireworks.ai/inference/v1/${embedding ? "embeddings" : "chat/completions"}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
            signal: options?.signal,
            redirect: "error",
          },
        );
        if (!response.ok) {
          await response.body?.cancel();
          throw new Error("Provider rejected request");
        }
        const result: unknown = await response.json();
        if (embedding) {
          return { data: [embeddingResponse.parse(result).data[0].embedding] };
        }
        return {
          response: chatResponse.parse(result).choices[0].message.content,
        };
      } catch {
        throw new AnalysisUnavailable("Fireworks is unavailable");
      }
    },
  };
}

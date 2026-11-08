import { z } from "zod";
import {
  conversationSchema,
  hiringBriefSchema,
  intakeResponseSchema,
  type HiringBrief,
  type HiringMessage,
} from "./schemas.ts";

export const voiceTurnRequestSchema = z
  .object({
    messages: conversationSchema.shape.messages,
    brief: hiringBriefSchema,
  })
  .strict()
  .refine(
    (value) => value.messages.at(-1)?.role === "user",
    "Send an answer first",
  );

export const voiceTurnResponseSchema = intakeResponseSchema.extend({
  readyForReview: z.boolean(),
});
export const speechRequestSchema = z
  .object({ text: z.string().trim().min(1).max(1000) })
  .strict();
export const transcriptionResponseSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "No speech was detected. Record again or type an answer.")
    .max(6000),
});

/** Keep previous facts while bounding recent context and encoded request bytes. */
export function voiceTurnRequest(
  history: HiringMessage[],
  answer: string,
  brief: HiringBrief,
) {
  const messages: HiringMessage[] = [
    ...history.slice(-23),
    { role: "user", content: answer.trim() },
  ];
  while (
    new TextEncoder().encode(JSON.stringify({ messages, brief })).length >
      28_000 &&
    messages.length > 1
  )
    messages.shift();
  if (
    new TextEncoder().encode(JSON.stringify({ messages, brief })).length >
    28_000
  )
    throw new Error(
      "The brief is too long for another voice turn. Review and edit the brief instead.",
    );
  return voiceTurnRequestSchema.parse({ messages, brief });
}

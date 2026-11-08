import { z } from "zod";

const shortText = z.string().trim().min(1).max(200);
const tags = z.array(shortText).max(20);
const amount = z.number().finite().min(0).max(1_000_000).nullable();

export const hiringBriefSchema = z
  .object({
    title: shortText.nullable(),
    description: z.string().trim().min(1).max(6000).nullable(),
    technologies: tags,
    causes: tags,
    communitiesServed: tags,
    workArrangement: z
      .enum(["remote", "hybrid", "onsite", "flexible"])
      .nullable(),
    location: shortText.nullable(),
    weeklyHours: z.number().int().min(1).max(80).nullable(),
    timeline: shortText.nullable(),
    compensation: z
      .object({
        kind: z.enum(["paid", "volunteer"]).nullable(),
        currency: z
          .string()
          .regex(/^[A-Z]{3}$/)
          .nullable(),
        period: z.enum(["hour", "project", "month", "year"]).nullable(),
        minimum: amount,
        maximum: amount,
      })
      .strict(),
  })
  .strict();

export const conversationSchema = z
  .object({
    messages: z
      .array(
        z
          .object({
            role: z.enum(["user", "assistant"]),
            content: z.string().trim().min(1).max(3000),
          })
          .strict(),
      )
      .min(1)
      .max(24),
  })
  .strict()
  .refine(
    (value) => value.messages.some((message) => message.role === "user"),
    "Describe the project first",
  );

export const intakeResponseSchema = z
  .object({
    brief: hiringBriefSchema,
    reply: z.string().trim().min(1).max(1000),
  })
  .strict();

export const extractionRequestSchema = z
  .object({
    messages: conversationSchema.shape.messages,
    brief: hiringBriefSchema,
  })
  .strict()
  .refine(
    (value) => value.messages.some((message) => message.role === "user"),
    "Describe the project first",
  );

export const extractionResponseSchema = z
  .object({ brief: hiringBriefSchema })
  .strict();

export const matchingCriteriaSchema = z
  .object({
    technologies: tags,
    experienceYears: z
      .object({
        preferredMin: z.number().min(0).max(3),
        preferredMax: z.number().min(0).max(3),
      })
      .strict(),
    causes: tags,
    communitiesServed: tags,
    learningOpportunities: tags,
    practicalConsiderations: z.array(shortText).max(10),
  })
  .strict();

export const recommendationsSchema = z
  .object({
    developers: z
      .array(
        z
          .object({
            developerId: z.string().min(1).max(100),
            reason: z.string().trim().min(1).max(700),
            needsDiscussion: z.array(shortText).max(5),
          })
          .strict(),
      )
      .max(10),
  })
  .strict();

export const confirmedBriefSchema = z
  .object({ brief: hiringBriefSchema })
  .strict()
  .superRefine(({ brief }, ctx) => {
    if (!brief.title || !brief.description)
      ctx.addIssue({
        code: "custom",
        message: "Add a title and project description",
        path: ["brief"],
      });
    if (
      brief.compensation.minimum !== null &&
      brief.compensation.maximum !== null &&
      brief.compensation.minimum > brief.compensation.maximum
    )
      ctx.addIssue({
        code: "custom",
        message: "Minimum compensation cannot exceed the maximum",
        path: ["brief", "compensation"],
      });
  });

export type HiringBrief = z.infer<typeof hiringBriefSchema>;
export type HiringMessage = z.infer<
  typeof conversationSchema
>["messages"][number];
export type IntakeResponse = z.infer<typeof intakeResponseSchema>;
export type MatchingCriteria = z.infer<typeof matchingCriteriaSchema>;
export type Recommendations = z.infer<typeof recommendationsSchema>;

export function emptyHiringBrief(): HiringBrief {
  return {
    title: null,
    description: null,
    technologies: [],
    causes: [],
    communitiesServed: [],
    workArrangement: null,
    location: null,
    weeklyHours: null,
    timeline: null,
    compensation: {
      kind: null,
      currency: null,
      period: null,
      minimum: null,
      maximum: null,
    },
  };
}

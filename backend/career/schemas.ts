import { z } from "zod";
import { analysisItemIdSchema, skillTagsSchema } from "../schemas.ts";

export const CAREER_ANALYSIS_VERSION = "career-v1";

export const careerTargetInputSchema = z
  .object({
    sourceText: z.string().trim().min(30).max(6000),
    sourceUrl: z
      .url()
      .max(2000)
      .refine(
        (value) => ["http:", "https:"].includes(new URL(value).protocol),
        "Use an HTTP or HTTPS source URL",
      )
      .optional(),
  })
  .strict();

export const careerTargetAnalysisSchema = z
  .object({
    title: z.string().trim().min(1).max(100),
    requirements: z
      .array(
        z
          .object({
            id: analysisItemIdSchema,
            description: z.string().trim().min(1).max(300),
            skills: skillTagsSchema,
            sourceQuote: z.string().trim().min(1).max(1000),
          })
          .strict(),
      )
      .min(1)
      .max(30)
      .refine(
        (values) =>
          new Set(values.map((value) => value.id)).size === values.length,
        "Requirement IDs must be unique",
      ),
  })
  .strict();

export const careerTargetSchema = careerTargetInputSchema
  .extend(careerTargetAnalysisSchema.shape)
  .superRefine((target, ctx) => {
    target.requirements.forEach((requirement, index) => {
      if (!target.sourceText.includes(requirement.sourceQuote)) {
        ctx.addIssue({
          code: "custom",
          path: ["requirements", index, "sourceQuote"],
          message: "Requirement quotes must appear in the original description",
        });
      }
    });
  });

export type CareerTargetInput = z.infer<typeof careerTargetInputSchema>;
export type CareerTarget = z.infer<typeof careerTargetSchema>;

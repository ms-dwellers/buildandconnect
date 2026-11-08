import { z } from "zod";
import { opportunitySchema } from "./schemas.ts";
import { opportunityDraftFromBrief } from "./hiring/opportunity-draft.ts";
import type { HiringBrief } from "./hiring/schemas.ts";

// Drafts preserve incomplete fields. Publishing applies the stricter schema.
export const projectDraftContentSchema = z
  .object({
    title: z.string().max(200),
    description: z.string().max(12000),
    city: z.string().max(200),
    kind: z.enum(["", "paid", "volunteer"]),
    remote: z.boolean(),
    collaboration: z.enum(["async", "sync", "flexible"]),
    essentialTechnologies: z.string().max(4000),
    interests: z.string().max(4000),
    minimumWeeklyHours: z.string().max(10),
    compensation: z.string().max(200),
    commitment: z.string().max(200),
    place: z.string().max(200),
    pin: z
      .object({
        latitude: z.number().finite().min(-90).max(90),
        longitude: z.number().finite().min(-180).max(180),
        place: z.string().max(200),
      })
      .strict()
      .nullable(),
  })
  .strict();
export type ProjectDraftContent = z.infer<typeof projectDraftContentSchema>;
export type ProjectDraftRecord = {
  id: string;
  content: ProjectDraftContent;
  updatedAt: number;
  publishedOpportunityId?: string;
};

export function emptyProjectDraft(): ProjectDraftContent {
  return {
    title: "",
    description: "",
    city: "",
    kind: "",
    remote: false,
    collaboration: "flexible",
    essentialTechnologies: "",
    interests: "",
    minimumWeeklyHours: "",
    compensation: "",
    commitment: "",
    place: "",
    pin: null,
  };
}

export function projectDraftFromBrief(brief: HiringBrief): ProjectDraftContent {
  const mapped = opportunityDraftFromBrief(brief);
  return {
    ...emptyProjectDraft(),
    title: mapped.title ?? "",
    description: mapped.description ?? "",
    city: mapped.city ?? "",
    kind: mapped.kind ?? "",
    remote: mapped.remote ?? false,
    interests: mapped.interests?.join(", ") ?? "",
    minimumWeeklyHours: mapped.minimumWeeklyHours?.toString() ?? "",
    compensation: mapped.compensation ?? "",
    commitment: mapped.commitment ?? "",
  };
}

export function opportunityFromDraft(content: ProjectDraftContent) {
  const list = (value: string) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  return opportunitySchema.parse({
    title: content.title,
    description: content.description,
    city: content.city,
    kind: content.kind,
    remote: content.remote,
    collaboration: content.collaboration,
    essentialTechnologies: list(content.essentialTechnologies),
    interests: list(content.interests),
    minimumWeeklyHours: content.minimumWeeklyHours.trim()
      ? Number(content.minimumWeeklyHours)
      : NaN,
    compensation:
      content.kind === "paid" && content.compensation.trim()
        ? content.compensation.trim()
        : undefined,
    commitment: content.commitment.trim() || undefined,
    ...(content.pin && {
      latitude: content.pin.latitude,
      longitude: content.pin.longitude,
      place: content.place.trim() || content.pin.place,
    }),
  });
}

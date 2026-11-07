import { z } from "zod";

const text = z.string().trim().min(1).max(100);
const tags = z
  .array(text)
  .max(30)
  .transform((values) => [...new Set(values.map(normalizeSkill))]);
const level = z.number().int().min(1).max(5);
export const collaboration = z.enum(["async", "sync", "flexible"]);

export function normalizeSkill(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, " ");
  const aliases: Record<string, string> = {
    js: "javascript",
    ts: "typescript",
    "react.js": "react",
    reactjs: "react",
    "node.js": "nodejs",
    node: "nodejs",
    "next.js": "nextjs",
    postgresql: "postgres",
  };
  return aliases[normalized] ?? normalized;
}

export const analysisSchema = z
  .object({
    requiredTechnologies: tags,
    preferredTechnologies: tags,
    difficulty: level,
    experienceLevel: z.enum(["beginner", "intermediate", "advanced"]),
    requiredSkills: tags,
    responsibilities: z.array(z.string().trim().min(1).max(300)).max(15),
    learningOpportunities: tags,
    mentorshipAvailable: z.boolean(),
  })
  .strict();

export const developerSchema = z
  .object({
    bio: z.string().trim().min(10).max(2000),
    city: text,
    skills: z
      .array(z.object({ name: text.transform(normalizeSkill), level }).strict())
      .min(1)
      .max(30)
      .refine(
        (skills) =>
          new Set(skills.map((skill) => skill.name)).size === skills.length,
        "Use each skill once",
      ),
    projects: z
      .array(
        z
          .object({
            title: text,
            description: z.string().trim().min(10).max(1000),
            technologies: tags,
          })
          .strict(),
      )
      .max(10),
    interests: tags,
    wantsToLearn: tags,
    experienceLevel: level,
    collaboration,
    weeklyHours: z.number().int().min(1).max(80),
    acceptsVolunteer: z.boolean(),
    available: z.boolean(),
    discoverable: z.boolean(),
  })
  .strict();

export const opportunitySchema = z
  .object({
    title: text,
    description: z.string().trim().min(30).max(6000),
    city: text,
    remote: z.boolean(),
    kind: z.enum(["paid", "volunteer"]),
    essentialTechnologies: tags,
    minimumWeeklyHours: z.number().int().min(1).max(80),
    collaboration,
    interests: tags,
  })
  .strict();

export const coordinatesSchema = z
  .object({
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
  })
  .strict();

export const developerLocationSchema = coordinatesSchema
  .extend({
    radiusKm: z.number().finite().min(1).max(100).default(25),
  })
  .strict();

export const requestSchema = z
  .object({
    title: text,
    description: z.string().trim().min(30).max(6000),
    place: text,
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
  })
  .strict();

export const vectorSchema = z
  .array(z.number().finite())
  .length(384)
  .refine(
    (values) => values.some((value) => value !== 0),
    "Embedding must not be zero",
  );

export type JobAnalysis = z.infer<typeof analysisSchema>;
export type DeveloperProfile = z.infer<typeof developerSchema>;
export type OpportunityInput = z.infer<typeof opportunitySchema>;
export type RequestInput = z.infer<typeof requestSchema>;
export type DeveloperLocation = z.infer<typeof developerLocationSchema>;
export type Role = "developer" | "company" | "recruiter" | "requester";
export type RequestStatus = "open" | "claimed" | "closed";

export type Developer = DeveloperProfile & {
  id: string;
  name: string;
  embedding: number[];
  recentExposure: number;
  location: DeveloperLocation | null;
};
export type Opportunity = OpportunityInput & {
  id: string;
  ownerId: string;
  analysis: JobAnalysis;
  embedding: number[];
  status: "open" | "closed";
};
export type LocalRequest = RequestInput & {
  id: string;
  ownerId: string;
  ownerName: string;
  analysis: JobAnalysis;
  embedding: number[];
  status: RequestStatus;
  claimedBy: string | null;
  claimantName: string | null;
  createdAt: number;
};

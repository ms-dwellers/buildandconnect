import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const tags = v.array(v.string());
const collaboration = v.union(
  v.literal("async"),
  v.literal("sync"),
  v.literal("flexible"),
);
export const role = v.union(v.literal("developer"), v.literal("requester"));
// Read compatibility only: legacy customer accounts now act as requesters.
const storedRole = v.union(role, v.literal("company"), v.literal("recruiter"));
export const location = v.object({
  latitude: v.number(),
  longitude: v.number(),
  radiusKm: v.number(),
});
export const developerPreferences = {
  professionalExperienceYears: v.union(v.number(), v.null()),
  compensationPreference: v.union(
    v.object({
      currency: v.string(),
      minimumHourlyRate: v.union(v.number(), v.null()),
      preferredHourlyRate: v.union(v.number(), v.null()),
    }),
    v.null(),
  ),
  workArrangementPreference: v.union(
    v.object({
      preferred: v.union(
        v.literal("remote"),
        v.literal("hybrid"),
        v.literal("onsite"),
        v.literal("flexible"),
      ),
      required: v.boolean(),
    }),
    v.null(),
  ),
};
export const profile = v.object({
  bio: v.string(),
  city: v.string(),
  skills: v.array(v.object({ name: v.string(), level: v.number() })),
  projects: v.array(
    v.object({
      title: v.string(),
      description: v.string(),
      technologies: tags,
    }),
  ),
  interests: tags,
  wantsToLearn: tags,
  experienceLevel: v.number(),
  collaboration,
  weeklyHours: v.number(),
  acceptsVolunteer: v.boolean(),
  available: v.boolean(),
  discoverable: v.boolean(),
  professionalExperienceYears: v.optional(
    developerPreferences.professionalExperienceYears,
  ),
  compensationPreference: v.optional(
    developerPreferences.compensationPreference,
  ),
  workArrangementPreference: v.optional(
    developerPreferences.workArrangementPreference,
  ),
});
export const analysis = v.object({
  requiredTechnologies: tags,
  preferredTechnologies: tags,
  difficulty: v.number(),
  experienceLevel: v.union(
    v.literal("beginner"),
    v.literal("intermediate"),
    v.literal("advanced"),
  ),
  requiredSkills: tags,
  responsibilities: tags,
  learningOpportunities: tags,
  mentorshipAvailable: v.boolean(),
  activities: v.optional(
    v.array(
      v.object({
        id: v.string(),
        description: v.string(),
        skills: tags,
      }),
    ),
  ),
});
export const careerTarget = v.object({
  title: v.string(),
  sourceText: v.string(),
  sourceUrl: v.optional(v.string()),
  requirements: v.array(
    v.object({
      id: v.string(),
      description: v.string(),
      skills: tags,
      sourceQuote: v.string(),
    }),
  ),
});
export const opportunity = v.object({
  title: v.string(),
  description: v.string(),
  city: v.string(),
  remote: v.boolean(),
  kind: v.union(v.literal("paid"), v.literal("volunteer")),
  essentialTechnologies: tags,
  minimumWeeklyHours: v.number(),
  collaboration,
  interests: tags,
  place: v.optional(v.string()),
  latitude: v.optional(v.number()),
  longitude: v.optional(v.number()),
  compensation: v.optional(v.string()),
  commitment: v.optional(v.string()),
});
export const request = v.object({
  title: v.string(),
  description: v.string(),
  place: v.string(),
  latitude: v.number(),
  longitude: v.number(),
});

export default defineSchema({
  conversations: defineTable({
    opportunityId: v.string(),
    requesterId: v.string(),
    developerId: v.string(),
    requesterName: v.string(),
    developerName: v.string(),
    title: v.string(),
    lastSequence: v.number(),
    requesterReadSequence: v.number(),
    developerReadSequence: v.number(),
    lastMessage: v.string(),
    updatedAt: v.number(),
  })
    .index("by_pair", ["opportunityId", "developerId"])
    .index("by_requester", ["requesterId", "updatedAt"])
    .index("by_developer", ["developerId", "updatedAt"]),
  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.string(),
    clientId: v.string(),
    body: v.string(),
    sequence: v.number(),
    sentAt: v.number(),
  })
    .index("by_conversation", ["conversationId", "sequence"])
    .index("by_submission", ["conversationId", "senderId", "clientId"])
    .index("by_sender", ["senderId", "sentAt"]),
  projectDrafts: defineTable({
    id: v.string(),
    ownerId: v.string(),
    content: v.any(),
    updatedAt: v.number(),
    publishedOpportunityId: v.optional(v.string()),
  })
    .index("by_public_id", ["id"])
    .index("by_owner", ["ownerId"]),
  careerTargets: defineTable({
    developerId: v.string(),
    target: careerTarget,
    analysisVersion: v.string(),
    updatedAt: v.number(),
  }).index("by_developer", ["developerId"]),
  members: defineTable({
    userId: v.string(),
    name: v.string(),
    role: storedRole,
  }).index("by_user", ["userId"]),
  developers: defineTable({
    userId: v.string(),
    name: v.string(),
    cityKey: v.string(),
    profile,
    embedding: v.array(v.number()),
    embeddingModel: v.string(),
    location: v.union(location, v.null()),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),
  opportunities: defineTable({
    revision: v.optional(v.number()),
    id: v.string(),
    ownerId: v.string(),
    ownerName: v.string(),
    cityKey: v.string(),
    details: opportunity,
    analysis,
    embedding: v.array(v.number()),
    analysisModel: v.string(),
    analysisVersion: v.string(),
    embeddingModel: v.string(),
    status: v.union(v.literal("open"), v.literal("closed")),
    createdAt: v.number(),
  })
    .index("by_public_id", ["id"])
    .index("by_owner", ["ownerId"])
    .index("by_status", ["status"]),
  requests: defineTable({
    revision: v.optional(v.number()),
    id: v.string(),
    ownerId: v.string(),
    ownerName: v.string(),
    details: request,
    analysis,
    embedding: v.array(v.number()),
    analysisModel: v.string(),
    analysisVersion: v.string(),
    embeddingModel: v.string(),
    status: v.union(
      v.literal("open"),
      v.literal("claimed"),
      v.literal("closed"),
    ),
    claimedBy: v.union(v.string(), v.null()),
    claimantName: v.union(v.string(), v.null()),
    createdAt: v.number(),
  })
    .index("by_public_id", ["id"])
    .index("by_owner", ["ownerId"])
    .index("by_claimant", ["claimedBy"])
    .index("by_status_latitude", ["status", "details.latitude"]),
  interests: defineTable({
    opportunityId: v.string(),
    developerId: v.string(),
    companyInterested: v.boolean(),
    developerInterested: v.boolean(),
    firstCompanyInterestAt: v.union(v.number(), v.null()),
    updatedAt: v.number(),
  })
    .index("by_pair", ["opportunityId", "developerId"])
    .index("by_developer", ["developerId"]),
});

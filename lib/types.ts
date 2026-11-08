// Response shapes returned by the same-origin `/api` facade. Type-only imports
// keep backend code out of client bundles.
import type {
  DeveloperLocation,
  DeveloperProfile,
  JobAnalysis,
  OpportunityInput,
  RequestInput,
  RequestStatus,
  Role,
} from "../backend/schemas.ts";
import type { CityJob } from "./calgary-area.ts";
import type { SkillBacking } from "../backend/skill-evidence.ts";

export type { DeveloperProfile, OpportunityInput, RequestInput, Role };

export type Page<T> = { data: T[]; nextCursor: string | null };

export type Me = { user: { id: string; name: string }; role: Role | null };

export type OwnProfile = DeveloperProfile & {
  skillEvidence?: SkillBacking[];
  revision?: number;
  id: string;
  name: string;
  location: DeveloperLocation | null;
};

export type PublicDeveloper = DeveloperProfile & {
  id: string;
  name: string;
  skillEvidence?: SkillBacking[];
};

export type ProjectSkillEvidence = {
  id: string;
  source: "opportunity" | "request";
  projectId: string;
  projectTitle: string;
  developerId: string;
  developerName: string;
  requesterName: string;
  skills: string[];
  contribution: string;
  confirmedSkills: string[];
  confirmedAt: number | null;
};

export type DeveloperReputation = {
  count: number;
  average: number | null;
  reviews: {
    opportunityId: string;
    requesterName: string;
    projectTitle: string;
    rating: number;
    comment: string;
    createdAt: number;
  }[];
};

export type OpportunityRecord = OpportunityInput & {
  revision?: number;
  id: string;
  ownerId: string;
  status: "open" | "closed";
  analysis: JobAnalysis;
};

export type RequestRecord = RequestInput & {
  revision?: number;
  id: string;
  ownerId: string;
  ownerName: string;
  status: RequestStatus;
  claimedBy: string | null;
  claimantName: string | null;
  analysis: JobAnalysis;
  createdAt: number;
};

export type MatchScores = {
  technicalReadiness: number;
  growthPotential: number;
  developerInterest: number;
  collaborationCompatibility: number;
  opportunityExposure: number;
};

export type DeveloperMatch = {
  considerations?: string[];
  developerId: string;
  name: string;
  score: number;
  scores: MatchScores;
  existingRelevantSkills: string[];
  skillsToDevelop: string[];
  explanation: string;
};

export type NearbyRequest = {
  requestId: string;
  title: string;
  description: string;
  place: string;
  latitude: number;
  longitude: number;
  ownerName: string;
  distanceKm: number;
  score: number;
  explanation: string;
  skillsToDevelop: string[];
};

export type Interest = {
  developerNote?: string;
  id: string;
  opportunityId: string;
  developerId: string;
  title: string;
  developerName: string;
  requesterName: string;
  requesterInterested: boolean;
  developerInterested: boolean;
  connected: boolean;
};

export type MapFeed = {
  viewer: { name: string; role: Role | null } | null;
  listings: CityJob[];
  truncated: boolean;
};

/** Social sign-in providers the Convex deployment has credentials for. */
export type AuthProviders = { google: boolean; github: boolean };
export type SocialProvider = keyof AuthProviders;

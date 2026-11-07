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

export type { DeveloperProfile, OpportunityInput, RequestInput, Role };

export type Page<T> = { data: T[]; nextCursor: string | null };

export type Me = { user: { id: string; name: string }; role: Role | null };

export type OwnProfile = DeveloperProfile & {
  id: string;
  name: string;
  location: DeveloperLocation | null;
};

export type PublicDeveloper = DeveloperProfile & { id: string; name: string };

export type OpportunityRecord = OpportunityInput & {
  id: string;
  ownerId: string;
  status: "open" | "closed";
  analysis: JobAnalysis;
};

export type RequestRecord = RequestInput & {
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
  id: string;
  opportunityId: string;
  developerId: string;
  title: string;
  developerName: string;
  companyName: string;
  companyInterested: boolean;
  developerInterested: boolean;
  connected: boolean;
};

export type MapFeed = {
  viewer: { name: string; role: Role | null } | null;
  listings: CityJob[];
  truncated: boolean;
};

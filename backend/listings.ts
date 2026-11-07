import type { CityJob } from "../lib/calgary-area.ts";
import { isInCalgary } from "../lib/calgary-area.ts";
import type {
  JobAnalysis,
  OpportunityInput,
  RequestInput,
  RequestStatus,
  Role,
} from "./schemas.ts";

export type Viewer = { id: string; role: Role | null } | null;

/**
 * Rounding to two decimals keeps a coarse neighbourhood (about 1 km) while
 * hiding the exact pin a requester may have placed on their home.
 */
export function approximate(value: number) {
  return Math.round(value * 100) / 100;
}

function topSkills(...groups: string[][]) {
  return [...new Set(groups.flat())].slice(0, 4);
}

export function opportunityListing(
  row: {
    id: string;
    ownerId: string;
    ownerName: string;
    details: OpportunityInput;
    analysis: JobAnalysis;
    status: "open" | "closed";
  },
  viewer: Viewer,
): CityJob | null {
  const { details } = row;
  if (
    row.status !== "open" ||
    details.latitude === undefined ||
    details.longitude === undefined
  )
    return null;
  const point = { latitude: details.latitude, longitude: details.longitude };
  if (!isInCalgary(point)) return null;
  return {
    ...point,
    id: row.id,
    source: "opportunity",
    title: details.title,
    organization: row.ownerName,
    neighbourhood: details.place ?? details.city,
    kind: details.kind,
    compensation:
      details.compensation ?? (details.kind === "paid" ? "Paid" : "Volunteer"),
    commitment:
      details.commitment ?? `${details.minimumWeeklyHours}+ hrs / week`,
    skills: topSkills(
      details.essentialTechnologies,
      row.analysis.requiredTechnologies,
    ),
    description: details.description,
    mentorship: row.analysis.mentorshipAvailable,
    status: "open",
    precise: true,
    viewerIsOwner: viewer?.id === row.ownerId,
    viewerHasClaimed: false,
  };
}

export function requestListing(
  row: {
    id: string;
    ownerId: string;
    ownerName: string;
    details: RequestInput;
    analysis: JobAnalysis;
    status: RequestStatus;
    claimedBy: string | null;
  },
  viewer: Viewer,
): CityJob | null {
  const owner = viewer?.id === row.ownerId;
  const claimant = viewer !== null && viewer.id === row.claimedBy;
  // Open requests are public. A claimed request stays visible only to the
  // people involved; closed requests never appear on the map.
  if (
    row.status === "closed" ||
    (row.status === "claimed" && !owner && !claimant)
  )
    return null;
  const { details } = row;
  if (!isInCalgary(details)) return null;
  // Developers can already view open requests in full through the API.
  const precise = owner || claimant || viewer?.role === "developer";
  return {
    latitude: precise ? details.latitude : approximate(details.latitude),
    longitude: precise ? details.longitude : approximate(details.longitude),
    id: row.id,
    source: "request",
    title: details.title,
    organization: precise ? row.ownerName : "Calgary neighbour",
    neighbourhood: precise ? details.place : "Approximate area",
    kind: "volunteer",
    compensation: "Volunteer",
    commitment: "Community request",
    skills: topSkills(row.analysis.requiredTechnologies),
    description: details.description,
    mentorship: row.analysis.mentorshipAvailable,
    status: row.status,
    precise,
    viewerIsOwner: owner,
    viewerHasClaimed: claimant,
  };
}

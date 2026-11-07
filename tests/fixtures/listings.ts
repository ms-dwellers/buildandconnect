import type { CityJob } from "../../lib/calgary-area.ts";

const base = {
  organization: "Fixture organisation",
  compensation: "Volunteer",
  commitment: "2-4 hrs / week",
  skills: ["React"],
  description: "A fixture listing used to exercise map behaviour.",
  mentorship: false,
  status: "open" as const,
  precise: true,
  viewerIsOwner: false,
  viewerHasClaimed: false,
};

function listing(
  id: string,
  neighbourhood: string,
  latitude: number,
  longitude: number,
  overrides: Partial<CityJob> = {},
): CityJob {
  return {
    ...base,
    id,
    source: "opportunity",
    kind: "volunteer",
    title: `${neighbourhood} project`,
    neighbourhood,
    latitude,
    longitude,
    ...overrides,
  };
}

/** Postings near the city's edges and centre, for framing and filter tests. */
export const LISTINGS: CityJob[] = [
  listing("kensington", "Kensington", 51.0525, -114.0865, {
    kind: "paid",
    compensation: "$1,200 project",
    skills: ["React", "Design"],
  }),
  listing("evanston", "Evanston", 51.176, -114.107, { kind: "paid" }),
  listing("tuscany", "Tuscany", 51.125, -114.248),
  listing("saddle-ridge", "Saddle Ridge", 51.131, -113.945, {
    source: "request",
    skills: ["Accessibility"],
  }),
  listing("west-springs", "West Springs", 51.058, -114.207),
  listing("forest-lawn", "Forest Lawn", 51.039, -113.972, {
    source: "request",
    precise: false,
  }),
  listing("somerset", "Somerset", 50.895, -114.083, { kind: "paid" }),
  listing("seton", "Seton", 50.879, -113.954, { source: "request" }),
];

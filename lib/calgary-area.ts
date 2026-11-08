// Shared by the browser and Convex functions. Keep this module
// dependency-free so server bundles do not pull in map or UI code.

export type CityPoint = { longitude: number; latitude: number };

export const CALGARY_CENTER: CityPoint = {
  longitude: -114.0719,
  latitude: 51.0447,
};

export const CALGARY_BOUNDS = [
  [-114.32, 50.84],
  [-113.85, 51.22],
] as const;

export function isInCalgary(point: CityPoint) {
  return (
    Number.isFinite(point.longitude) &&
    Number.isFinite(point.latitude) &&
    point.longitude >= CALGARY_BOUNDS[0][0] &&
    point.longitude <= CALGARY_BOUNDS[1][0] &&
    point.latitude >= CALGARY_BOUNDS[0][1] &&
    point.latitude <= CALGARY_BOUNDS[1][1]
  );
}

/** A posting as the public map renders it, for either source table. */
export type CityJob = CityPoint & {
  id: string;
  source: "opportunity" | "request";
  title: string;
  organization: string;
  neighbourhood: string;
  kind: "paid" | "volunteer";
  compensation: string;
  commitment: string;
  skills: string[];
  description: string;
  mentorship: boolean;
  status: "open" | "claimed";
  /** False when coordinates were coarsened to protect a requester's location. */
  precise: boolean;
  viewerIsOwner: boolean;
  viewerHasClaimed: boolean;
};

/** The city this deployment serves; the hero monitor and journey caption show it. */
export const CITY_NAME = "Calgary";

import {
  CALGARY_BOUNDS,
  type CityJob,
  type CityPoint,
} from "./calgary-area.ts";

export {
  CALGARY_BOUNDS,
  CALGARY_CENTER,
  isInCalgary,
  type CityJob,
  type CityPoint,
} from "./calgary-area.ts";

export const PREVIEW_BOUNDS = CALGARY_BOUNDS;

export function previewPosition(point: CityPoint) {
  return {
    x:
      ((point.longitude - PREVIEW_BOUNDS[0][0]) /
        (PREVIEW_BOUNDS[1][0] - PREVIEW_BOUNDS[0][0])) *
      100,
    y:
      ((PREVIEW_BOUNDS[1][1] - point.latitude) /
        (PREVIEW_BOUNDS[1][1] - PREVIEW_BOUNDS[0][1])) *
      100,
  };
}

export function previewPoint(x: number, y: number): CityPoint {
  return {
    longitude:
      PREVIEW_BOUNDS[0][0] +
      Math.max(0, Math.min(1, x)) *
        (PREVIEW_BOUNDS[1][0] - PREVIEW_BOUNDS[0][0]),
    latitude:
      PREVIEW_BOUNDS[1][1] -
      Math.max(0, Math.min(1, y)) *
        (PREVIEW_BOUNDS[1][1] - PREVIEW_BOUNDS[0][1]),
  };
}

export function previewViewport(
  width: number,
  height: number,
  center?: CityPoint,
) {
  if (!center) {
    const scale = Math.min(width / 1000, height / 700);
    return {
      width: 1000 * scale,
      height: 700 * scale,
      left: (width - 1000 * scale) / 2,
      top: (height - 700 * scale) / 2,
    };
  }
  const scale = Math.max(width / 1000, height / 700);
  const mapWidth = 1000 * scale;
  const mapHeight = 700 * scale;
  const point = previewPosition(center);
  return {
    width: mapWidth,
    height: mapHeight,
    left: Math.max(
      width - mapWidth,
      Math.min(0, width / 2 - (point.x / 100) * mapWidth),
    ),
    top: Math.max(
      height - mapHeight,
      Math.min(0, height / 2 - (point.y / 100) * mapHeight),
    ),
  };
}

export type MapFilter = "all" | "paid" | "volunteer" | "request";

export function matchesFilter(job: CityJob, filter: MapFilter) {
  if (filter === "all") return true;
  if (filter === "request") return job.source === "request";
  return job.source === "opportunity" && job.kind === filter;
}

export function filterCityJobs(
  jobs: CityJob[],
  query: string,
  filter: MapFilter,
) {
  const term = query.trim().toLowerCase();
  return jobs.filter(
    (job) =>
      matchesFilter(job, filter) &&
      `${job.title} ${job.organization} ${job.neighbourhood} ${job.skills.join(" ")}`
        .toLowerCase()
        .includes(term),
  );
}

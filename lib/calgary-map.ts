import type { FeatureCollection, Point } from "geojson";
import type {
  FilterSpecification,
  LayerSpecification,
  Map as MapboxMap,
} from "mapbox-gl";
import { CALGARY_BOUNDS, type CityJob, type CityPoint } from "./calgary.ts";

export const CITY_MAP_STYLE = "mapbox://styles/mapbox/standard";
export const JOB_SOURCE = "calgary-jobs";
export const CLUSTER_LAYER = "calgary-job-clusters";
export const POINT_LAYER = "calgary-job-points";

export type MapPalette = {
  primary: string;
  surface: string;
  secondary: string;
  foreground: string;
  primaryForeground: string;
};

export function jobLayers(colors: MapPalette): LayerSpecification[] {
  const clusters: FilterSpecification = ["has", "point_count"];
  const points: FilterSpecification = ["!", ["has", "point_count"]];
  return [
    {
      id: CLUSTER_LAYER,
      type: "circle",
      source: JOB_SOURCE,
      slot: "top",
      filter: clusters,
      paint: {
        "circle-radius": ["step", ["get", "point_count"], 19, 10, 23],
        "circle-color": colors.primary,
        "circle-stroke-color": colors.surface,
        "circle-stroke-width": 3,
        "circle-emissive-strength": 1,
      },
    },
    {
      id: `${CLUSTER_LAYER}-count`,
      type: "symbol",
      source: JOB_SOURCE,
      slot: "top",
      filter: clusters,
      layout: {
        "text-field": ["get", "point_count_abbreviated"],
        "text-size": 13,
        "text-allow-overlap": true,
      },
      paint: {
        "text-color": colors.primaryForeground,
        "text-emissive-strength": 1,
      },
    },
    {
      id: POINT_LAYER,
      type: "circle",
      source: JOB_SOURCE,
      slot: "top",
      filter: points,
      paint: {
        "circle-radius": 13,
        "circle-color": [
          "match",
          ["get", "kind"],
          "paid",
          colors.primary,
          colors.secondary,
        ],
        "circle-stroke-color": colors.surface,
        "circle-stroke-width": 2,
        "circle-emissive-strength": 1,
      },
    },
    {
      id: `${POINT_LAYER}-label`,
      type: "symbol",
      source: JOB_SOURCE,
      slot: "top",
      filter: points,
      layout: {
        "text-field": ["match", ["get", "kind"], "paid", "P", "V"],
        "text-size": 11,
        "text-allow-overlap": true,
      },
      paint: {
        "text-color": [
          "match",
          ["get", "kind"],
          "paid",
          colors.primaryForeground,
          colors.foreground,
        ],
        "text-emissive-strength": 1,
      },
    },
  ];
}

export function jobFeatures(
  jobs: CityJob[],
): FeatureCollection<Point, { id: string; kind: CityJob["kind"] }> {
  return {
    type: "FeatureCollection",
    features: jobs.map((job) => ({
      type: "Feature",
      id: job.id,
      geometry: { type: "Point", coordinates: [job.longitude, job.latitude] },
      properties: { id: job.id, kind: job.kind },
    })),
  };
}

// Padding is viewport-relative so the city and controls fit on phones as well as desktops.
export function cityOverviewPadding(width: number, height: number) {
  return {
    top: Math.min(88, height * 0.18),
    bottom: Math.min(72, height * 0.14),
    left: Math.min(56, width * 0.1),
    right: Math.min(56, width * 0.1),
  };
}

export function cityBounds(): [[number, number], [number, number]] {
  return [[...CALGARY_BOUNDS[0]], [...CALGARY_BOUNDS[1]]];
}

export function jobCamera(
  point: CityPoint,
  reducedMotion: boolean,
): Parameters<MapboxMap["flyTo"]>[0] {
  return {
    center: [point.longitude, point.latitude],
    zoom: 16.6,
    pitch: 60,
    bearing: -25,
    duration: reducedMotion ? 0 : 1800,
    essential: false,
  };
}

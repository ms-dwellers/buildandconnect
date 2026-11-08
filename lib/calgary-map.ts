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

export function cityMapMode({
  hasToken,
  ready,
  failed,
}: {
  hasToken: boolean;
  ready: boolean;
  failed: boolean;
}): "loading" | "mapbox" | "preview" {
  if (!hasToken || failed) return "preview";
  return ready ? "mapbox" : "loading";
}

export type MapPalette = {
  primary: string;
  surface: string;
  secondary: string;
  community: string;
  foreground: string;
  primaryForeground: string;
};

export type CityMapPalette = {
  land: string;
  water: string;
  greenspace: string;
  /** Soft fills for Mapbox Standard landuse belts (industrial defaults read red). */
  industrial: string;
  commercial: string;
  education: string;
  medical: string;
  roads: string;
  motorways: string;
  buildings: string;
  labels: string;
};

export type CityLightPreset = "day" | "dusk" | "dawn" | "night";
export type CityMapTheme = "default" | "faded" | "monochrome";

export function cityMapConfig(
  colors: CityMapPalette,
  lightPreset: CityLightPreset = "day",
  theme: CityMapTheme = "default",
) {
  return {
    theme,
    lightPreset,
    font: "Manrope",
    show3dObjects: true,
    showPointOfInterestLabels: false,
    showTransitLabels: false,
    showAdminBoundaries: false,
    colorLand: colors.land,
    colorWater: colors.water,
    colorGreenspace: colors.greenspace,
    colorIndustrial: colors.industrial,
    colorCommercial: colors.commercial,
    colorEducation: colors.education,
    colorMedical: colors.medical,
    colorRoads: colors.roads,
    colorMotorways: colors.motorways,
    colorTrunks: colors.motorways,
    colorBuildings: colors.buildings,
    colorPlaceLabels: colors.labels,
    colorRoadLabels: colors.labels,
  };
}

const LIGHT_PRESETS: CityLightPreset[] = ["day", "dusk", "dawn", "night"];
const MAP_THEMES: CityMapTheme[] = ["default", "faded", "monochrome"];

/** Mapbox Standard paints buildings black until colorBuildings is a real colour. */
function cssColor(
  styles: Pick<CSSStyleDeclaration, "getPropertyValue">,
  name: string,
  fallback: string,
) {
  const value = styles.getPropertyValue(name).trim();
  return value && value !== "transparent" ? value : fallback;
}

export function cityMapConfigFromStyles(
  styles: Pick<CSSStyleDeclaration, "getPropertyValue">,
) {
  const preset = cssColor(styles, "--map-light-preset", "day").replace(
    /["']/g,
    "",
  );
  // Faded softens Standard's built-in landcover, which otherwise shows through
  // as saturated pink and green farmland around the city.
  const theme = cssColor(styles, "--map-theme", "default").replace(/["']/g, "");
  const greenspace = cssColor(styles, "--map-park", "#a4c2ad");
  const land = cssColor(styles, "--map-base", "#ececda");
  return cityMapConfig(
    {
      land,
      water: cssColor(styles, "--map-water", "#8fb3ac"),
      greenspace,
      // Fall back toward greenspace/land so missing tokens never leave Mapbox reds.
      industrial: cssColor(styles, "--map-industrial", greenspace),
      commercial: cssColor(styles, "--map-commercial", land),
      education: cssColor(styles, "--map-education", land),
      medical: cssColor(styles, "--map-medical", greenspace),
      roads: cssColor(styles, "--map-road", "#f8f7de"),
      motorways: cssColor(styles, "--map-arterial", "#dfc999"),
      // Prefer the dedicated building token; fall back to block fill, never "".
      buildings: cssColor(
        styles,
        "--map-building",
        cssColor(styles, "--map-block", "#c4d8c8"),
      ),
      labels: cssColor(styles, "--map-label", "#425f57"),
    },
    LIGHT_PRESETS.find((candidate) => candidate === preset) ?? "day",
    MAP_THEMES.find((candidate) => candidate === theme) ?? "default",
  );
}

/**
 * Standard's import finishes after Map construction; re-apply basemap colours
 * on style.load so colorBuildings is not left at the default black.
 */
export function applyCityMapBasemap(
  map: {
    setConfigProperty: (
      importId: string,
      configName: string,
      value: unknown,
    ) => unknown;
  },
  styles: Pick<CSSStyleDeclaration, "getPropertyValue">,
) {
  const config = cityMapConfigFromStyles(styles);
  for (const [key, value] of Object.entries(config))
    map.setConfigProperty("basemap", key, value);
}

export function cityPerspective(tilted: boolean, reducedMotion: boolean) {
  return {
    pitch: tilted ? 55 : 0,
    bearing: tilted ? -20 : 0,
    duration: reducedMotion ? 0 : 900,
    essential: false,
  };
}

export function isMapInteraction(originalEvent?: { type: string }) {
  return Boolean(originalEvent && originalEvent.type !== "resize");
}

export function jobLayers(colors: MapPalette): LayerSpecification[] {
  const clusters: FilterSpecification = ["has", "point_count"];
  const points: FilterSpecification = ["!", ["has", "point_count"]];
  return [
    {
      id: `${CLUSTER_LAYER}-halo`,
      type: "circle",
      source: JOB_SOURCE,
      slot: "top",
      filter: clusters,
      paint: {
        "circle-radius": ["step", ["get", "point_count"], 29, 10, 34],
        "circle-color": colors.primary,
        "circle-opacity": 0.14,
        "circle-emissive-strength": 1,
      },
    },
    {
      id: CLUSTER_LAYER,
      type: "circle",
      source: JOB_SOURCE,
      slot: "top",
      filter: clusters,
      paint: {
        "circle-radius": ["step", ["get", "point_count"], 21, 10, 26],
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
      id: `${POINT_LAYER}-halo`,
      type: "circle",
      source: JOB_SOURCE,
      slot: "top",
      filter: points,
      paint: {
        "circle-radius": 23,
        "circle-color": colors.primary,
        "circle-opacity": 0.12,
        "circle-emissive-strength": 1,
      },
    },
    {
      id: POINT_LAYER,
      type: "circle",
      source: JOB_SOURCE,
      slot: "top",
      filter: points,
      paint: {
        "circle-radius": [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          19,
          16,
        ],
        "circle-color": [
          "match",
          ["get", "label"],
          "P",
          colors.primary,
          "R",
          colors.community,
          colors.secondary,
        ],
        "circle-stroke-color": [
          "match",
          ["get", "label"],
          "P",
          colors.surface,
          colors.primary,
        ],
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
        "text-field": ["get", "label"],
        "text-size": 12,
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
): FeatureCollection<
  Point,
  { id: string; kind: CityJob["kind"]; label: "P" | "V" | "R" }
> {
  return {
    type: "FeatureCollection",
    features: jobs.map((job) => ({
      type: "Feature",
      id: job.id,
      geometry: { type: "Point", coordinates: [job.longitude, job.latitude] },
      properties: {
        id: job.id,
        kind: job.kind,
        label: job.source === "request" ? "R" : job.kind === "paid" ? "P" : "V",
      },
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

"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import type {
  FilterSpecification,
  GeoJSONSource,
  Map as MapboxMap,
  MapMouseEvent,
} from "mapbox-gl";
import { isInCalgary, type CityJob, type CityPoint } from "@/lib/calgary";
import {
  CITY_MAP_STYLE,
  JOB_SOURCE,
  CLUSTER_LAYER,
  POINT_LAYER,
  cityBounds,
  cityOverviewPadding,
  cityMapConfigFromStyles,
  cityPerspective,
  isMapInteraction,
  jobCamera,
  jobFeatures,
  jobLayers,
  type MapPalette,
} from "@/lib/calgary-map";
import { useRootTheme } from "@/lib/use-root-theme";

export type LiveCityMap = {
  map: MapboxMap;
  Marker: typeof import("mapbox-gl").Marker;
};
type CameraState = {
  zoom: number;
  pitch: number;
  moving: boolean;
  settledJobId: string | null;
};
const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function markerPalette(styles: CSSStyleDeclaration): MapPalette {
  const color = (name: string) => styles.getPropertyValue(name).trim();
  return {
    primary: color("--primary"),
    surface: color("--card"),
    secondary: color("--secondary"),
    community: color("--map-community"),
    foreground: color("--foreground"),
    primaryForeground: color("--primary-foreground"),
  };
}

export function useCalgaryMap({
  container,
  token,
  jobs,
  selectedJob,
  placing,
  arriving,
  onPick,
  onSelect,
}: {
  container: RefObject<HTMLDivElement | null>;
  token: string | null;
  jobs: CityJob[];
  selectedJob: CityJob | undefined;
  placing: boolean;
  arriving: boolean;
  onPick: (point: CityPoint) => void;
  onSelect: (id: string | null) => void;
}) {
  const [live, setLive] = useState<LiveCityMap | null>(null);
  const [failed, setFailed] = useState(false);
  const [warning, setWarning] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const theme = useRootTheme();
  const overviewActive = useRef(true);
  const [camera, setCamera] = useState<CameraState>({
    zoom: 0,
    pitch: 0,
    moving: false,
    settledJobId: null,
  });
  // Map event listeners keep a stable lifecycle, but must always see current UI state.
  const current = useRef({
    jobs,
    selectedJob,
    placing,
    arriving,
    onPick,
    onSelect,
  });
  useEffect(() => {
    current.current = {
      jobs,
      selectedJob,
      placing,
      arriving,
      onPick,
      onSelect,
    };
  }, [jobs, selectedJob, placing, arriving, onPick, onSelect]);

  const overview = useCallback((map: MapboxMap, animate: boolean) => {
    overviewActive.current = true;
    const { width, height } = map.getContainer().getBoundingClientRect();
    map.stop();
    const target = map.cameraForBounds(cityBounds(), {
      padding: cityOverviewPadding(width, height),
      pitch: 0,
      bearing: 0,
      maxZoom: 12,
    });
    if (!target) return;
    if (animate && !reducedMotion())
      map.flyTo({ ...target, duration: 1400, essential: false });
    else map.jumpTo(target);
  }, []);

  useEffect(() => {
    if (!token || !container.current) return;
    let disposed = false;
    let map: MapboxMap | undefined;
    let loaded = false;
    let broken = false;
    let observer: ResizeObserver | undefined;
    let clusterRequest = 0;
    const timeout = setTimeout(() => {
      if (!disposed && !loaded) fail();
    }, 25000);
    const fail = () => {
      if (disposed || broken) return;
      broken = true;
      clearTimeout(timeout);
      observer?.disconnect();
      map?.remove();
      map = undefined;
      setFailed(true);
      setLive(null);
    };
    setFailed(false);
    setWarning(false);

    void import("mapbox-gl")
      .then(({ default: sdk }) => {
        if (disposed || broken || !container.current) return;
        try {
          const styles = getComputedStyle(container.current);
          const palette = markerPalette(styles);
          const instance = new sdk.Map({
            container: container.current,
            accessToken: token,
            style: CITY_MAP_STYLE,
            config: {
              basemap: cityMapConfigFromStyles(styles),
            },
            bounds: cityBounds(),
            fitBoundsOptions: {
              padding: cityOverviewPadding(
                container.current.clientWidth,
                container.current.clientHeight,
              ),
              maxZoom: 12,
            },
            minZoom: 8,
            maxZoom: 19,
            maxPitch: 70,
            // Permit enough local context to fit the whole city on both wide and tall screens.
            maxBounds: [
              [-114.7, 50.5],
              [-113.5, 51.55],
            ],
            projection: "mercator",
            renderWorldCopies: false,
            attributionControl: true,
            antialias: true,
          });
          map = instance;
          const snapshot = () => {
            if (!disposed && !broken)
              setCamera({
                zoom: instance.getZoom(),
                pitch: instance.getPitch(),
                moving: instance.isMoving(),
                settledJobId: instance.isMoving()
                  ? null
                  : (current.current.selectedJob?.id ?? null),
              });
          };
          instance.on("style.load", () => {
            if (disposed || broken) return;
            if (instance.getSource(JOB_SOURCE)) return;
            instance.addSource(JOB_SOURCE, {
              type: "geojson",
              data: jobFeatures(current.current.jobs),
              cluster: true,
              clusterRadius: 34,
              clusterMaxZoom: 13,
            });
            for (const layer of jobLayers(palette)) instance.addLayer(layer);
          });
          instance.on("load", () => {
            if (disposed || broken) return;
            loaded = true;
            clearTimeout(timeout);
            setWarning(false);
            setLive({ map: instance, Marker: sdk.Marker });
            overview(instance, current.current.arriving);
            snapshot();
          });
          instance.on("movestart", (event) => {
            if (isMapInteraction(event.originalEvent))
              overviewActive.current = false;
            snapshot();
          });
          instance.on("moveend", snapshot);
          instance.on("click", (event: MapMouseEvent) => {
            if (!loaded || disposed || broken) return;
            if (current.current.placing) {
              const point = {
                longitude: event.lngLat.lng,
                latitude: event.lngLat.lat,
              };
              if (isInCalgary(point)) current.current.onPick(point);
              return;
            }
            const request = ++clusterRequest;
            const feature = instance.queryRenderedFeatures(event.point, {
              layers: [CLUSTER_LAYER, POINT_LAYER],
            })[0];
            if (!feature || feature.geometry.type !== "Point") return;
            if (feature.properties?.cluster) {
              overviewActive.current = false;
              const requestedJobs = current.current.jobs;
              const requestedSelection = current.current.selectedJob?.id;
              const source = instance.getSource<GeoJSONSource>(JOB_SOURCE);
              const coordinates = feature.geometry.coordinates as [
                number,
                number,
              ];
              source?.getClusterExpansionZoom(
                Number(feature.properties.cluster_id),
                (error, zoom) => {
                  if (
                    error ||
                    disposed ||
                    broken ||
                    request !== clusterRequest ||
                    requestedJobs !== current.current.jobs ||
                    requestedSelection !== current.current.selectedJob?.id ||
                    zoom === null ||
                    zoom === undefined
                  )
                    return;
                  instance.flyTo({
                    center: coordinates,
                    zoom,
                    pitch: 0,
                    bearing: 0,
                    duration: reducedMotion() ? 0 : 700,
                    essential: false,
                  });
                },
              );
            } else if (typeof feature.properties?.id === "string")
              current.current.onSelect(feature.properties.id);
          });
          const cursor = () => {
            instance.getCanvas().style.cursor = current.current.placing
              ? "crosshair"
              : "pointer";
          };
          for (const layer of [CLUSTER_LAYER, POINT_LAYER]) {
            instance.on("mouseenter", layer, cursor);
            instance.on("mouseleave", layer, () => {
              instance.getCanvas().style.cursor = current.current.placing
                ? "crosshair"
                : "";
            });
          }
          let hoveredId: string | number | undefined;
          instance.on("mousemove", POINT_LAYER, (event) => {
            const id = event.features?.[0]?.id;
            if (id === hoveredId) return;
            if (hoveredId !== undefined)
              instance.setFeatureState(
                { source: JOB_SOURCE, id: hoveredId },
                { hover: false },
              );
            hoveredId = id;
            if (id !== undefined)
              instance.setFeatureState(
                { source: JOB_SOURCE, id },
                { hover: true },
              );
          });
          instance.on("mouseleave", POINT_LAYER, () => {
            if (hoveredId !== undefined)
              instance.setFeatureState(
                { source: JOB_SOURCE, id: hoveredId },
                { hover: false },
              );
            hoveredId = undefined;
          });
          // A bad token or lost WebGL context is fatal. An isolated tile error is not.
          instance.on("error", (event) => {
            const status = (event.error as Error & { status?: number }).status;
            if (status === 401 || status === 403) fail();
            else if (!disposed) setWarning(true);
          });
          instance.on("webglcontextlost", fail);
          instance.addControl(
            new sdk.NavigationControl({ visualizePitch: true }),
            "bottom-right",
          );
          observer = new ResizeObserver(() => {
            instance.resize();
            if (loaded && !broken && overviewActive.current)
              overview(instance, false);
          });
          observer.observe(container.current);
        } catch {
          fail();
        }
      })
      .catch(fail);
    return () => {
      disposed = true;
      clearTimeout(timeout);
      observer?.disconnect();
      map?.remove();
      setLive(null);
    };
  }, [container, token, attempt, overview]);

  useEffect(() => {
    live?.map.getSource<GeoJSONSource>(JOB_SOURCE)?.setData(jobFeatures(jobs));
  }, [live, jobs]);
  // Retint in place when the role theme changes, keeping the camera and markers.
  useEffect(() => {
    const element = container.current;
    if (!live || !element) return;
    const styles = getComputedStyle(element);
    live.map.setConfig("basemap", cityMapConfigFromStyles(styles));
    for (const layer of jobLayers(markerPalette(styles))) {
      if (!live.map.getLayer(layer.id) || !("paint" in layer)) continue;
      for (const [name, value] of Object.entries(layer.paint ?? {}))
        live.map.setPaintProperty(
          layer.id,
          name as Parameters<MapboxMap["setPaintProperty"]>[1],
          value,
        );
    }
  }, [live, theme, container]);
  useEffect(() => {
    if (!live) return;
    // The selected DOM marker replaces all three GPU-rendered point layers.
    // Keep the source intact so selection never changes cluster membership.
    const filter: FilterSpecification = ["!", ["has", "point_count"]];
    const visiblePoints: FilterSpecification = selectedJob
      ? ["all", filter, ["!=", ["get", "id"], selectedJob.id]]
      : filter;
    for (const layer of [
      `${POINT_LAYER}-halo`,
      POINT_LAYER,
      `${POINT_LAYER}-label`,
    ]) {
      live.map.setFilter(layer, visiblePoints);
    }
  }, [live, selectedJob]);
  useEffect(() => {
    if (!live || !selectedJob) return;
    overviewActive.current = false;
    live.map.stop();
    live.map.flyTo({
      ...jobCamera(selectedJob, reducedMotion()),
      offset: [0, Math.min(150, live.map.getContainer().clientHeight * 0.22)],
    });
  }, [live, selectedJob]);
  useEffect(() => {
    if (!live) return;
    live.map.getCanvas().style.cursor = placing ? "crosshair" : "";
    if (placing) overview(live.map, true);
  }, [live, placing, overview]);

  function showCity() {
    onSelect(null);
    if (live) overview(live.map, true);
  }
  function retry() {
    setAttempt((value) => value + 1);
  }
  function togglePerspective() {
    if (!live) return;
    overviewActive.current = false;
    live.map.stop();
    live.map.easeTo(cityPerspective(live.map.getPitch() < 30, reducedMotion()));
  }
  return {
    live: failed ? null : live,
    failed,
    warning,
    camera,
    showCity,
    retry,
    togglePerspective,
  };
}

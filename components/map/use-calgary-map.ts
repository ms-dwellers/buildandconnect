"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import type { GeoJSONSource, Map as MapboxMap, MapMouseEvent } from "mapbox-gl";
import { isInCalgary, type CityJob, type CityPoint } from "@/lib/calgary";
import {
  CITY_MAP_STYLE,
  JOB_SOURCE,
  CLUSTER_LAYER,
  POINT_LAYER,
  cityBounds,
  cityOverviewPadding,
  jobCamera,
  jobFeatures,
  jobLayers,
} from "@/lib/calgary-map";

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
          const instance = new sdk.Map({
            container: container.current,
            accessToken: token,
            style: CITY_MAP_STYLE,
            config: {
              basemap: {
                lightPreset: "day",
                theme: "faded",
                show3dObjects: true,
                showPointOfInterestLabels: false,
              },
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
          const styles = getComputedStyle(container.current);
          const color = (name: string) => styles.getPropertyValue(name).trim();
          const palette = {
            primary: color("--primary"),
            surface: color("--card"),
            secondary: color("--secondary"),
            community: color("--palette-teal"),
            foreground: color("--foreground"),
            primaryForeground: color("--primary-foreground"),
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
            if (event.originalEvent) overviewActive.current = false;
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
          instance.addControl(
            new sdk.ScaleControl({ unit: "metric", maxWidth: 110 }),
            "bottom-left",
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
  return {
    live: failed ? null : live,
    failed,
    warning,
    camera,
    showCity,
    retry,
  };
}

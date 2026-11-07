"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapboxMap } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { CompassIcon, RotateCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mapboxToken } from "@/lib/api";
import {
  CALGARY_BOUNDS,
  CALGARY_CENTER,
  isInCalgary,
  previewPoint,
  previewPosition,
  previewViewport,
  type CityJob,
  type CityPoint,
} from "@/lib/calgary";
import { CityIllustration } from "./city-illustration";
import { JobMarker } from "./job-marker";
import { useMapJourney } from "./map-journey";

export function CalgaryCanvas({
  jobs,
  selectedId,
  onSelect,
  placing,
  onPick,
}: {
  jobs: CityJob[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  placing: boolean;
  onPick: (point: CityPoint) => void;
}) {
  const journey = useMapJourney();
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const pickRef = useRef(onPick);
  const jobsRef = useRef(jobs);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [size, setSize] = useState({ width: 1000, height: 700 });
  const [positions, setPositions] = useState<
    Record<string, { x: number; y: number }>
  >({});
  const token = mapboxToken();
  const selectedJob = jobs.find((job) => job.id === selectedId);
  const preview = previewViewport(
    size.width,
    size.height,
    selectedJob ?? CALGARY_CENTER,
  );
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      }),
    );
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    pickRef.current = onPick;
    jobsRef.current = jobs;
  }, [onPick, jobs]);

  useEffect(() => {
    if (!token || !container.current || failed) return;
    let disposed = false;
    let observer: ResizeObserver | undefined;
    void import("mapbox-gl")
      .then(({ default: mapbox }) => {
        if (disposed || !container.current) return;
        try {
          const map = new mapbox.Map({
            container: container.current,
            accessToken: token,
            style: "mapbox://styles/mapbox/streets-v12",
            center: [CALGARY_CENTER.longitude, CALGARY_CENTER.latitude],
            zoom: 10.8,
            minZoom: 9.6,
            maxZoom: 16,
            maxBounds: [[...CALGARY_BOUNDS[0]], [...CALGARY_BOUNDS[1]]],
            attributionControl: true,
            renderWorldCopies: false,
          });
          mapRef.current = map;
          const update = () => {
            if (disposed) return;
            setPositions(
              Object.fromEntries(
                jobsRef.current.map((job) => {
                  const point = map.project([job.longitude, job.latitude]);
                  return [job.id, { x: point.x, y: point.y }];
                }),
              ),
            );
          };
          map.on("move", update);
          map.on("resize", update);
          map.on("load", () => {
            if (!disposed) {
              setLoaded(true);
              update();
            }
          });
          map.on("click", (event) => {
            const point = {
              longitude: event.lngLat.lng,
              latitude: event.lngLat.lat,
            };
            if (isInCalgary(point)) pickRef.current(point);
          });
          map.on("error", () => {
            if (!disposed) {
              setLoaded(false);
              setFailed(true);
            }
          });
          map.addControl(
            new mapbox.NavigationControl({ showCompass: false }),
            "bottom-right",
          );
          observer = new ResizeObserver(() => map.resize());
          observer.observe(container.current);
        } catch {
          if (!disposed) setFailed(true);
        }
      })
      .catch(() => {
        if (!disposed) setFailed(true);
      });
    return () => {
      disposed = true;
      observer?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
      setLoaded(false);
    };
  }, [token, failed]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    setPositions(
      Object.fromEntries(
        jobs.map((job) => {
          const point = map.project([job.longitude, job.latitude]);
          return [job.id, { x: point.x, y: point.y }];
        }),
      ),
    );
  }, [jobs, loaded]);

  useEffect(() => {
    if (!loaded || !mapRef.current) return;
    if (journey.phase === "revealing")
      mapRef.current.flyTo({
        center: [CALGARY_CENTER.longitude, CALGARY_CENTER.latitude],
        zoom: 12.1,
        duration: 1800,
        essential: false,
      });
  }, [journey.phase, loaded]);

  useEffect(() => {
    const job = jobs.find((item) => item.id === selectedId);
    if (job && loaded)
      mapRef.current?.easeTo({
        center: [job.longitude, job.latitude],
        duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? 0
          : 400,
      });
  }, [selectedId, jobs, loaded]);

  function recenter() {
    onSelect(null);
    mapRef.current?.flyTo({
      center: [CALGARY_CENTER.longitude, CALGARY_CENTER.latitude],
      zoom: 11.5,
      duration: 700,
      essential: false,
    });
  }

  return (
    <div
      className={`relative isolate size-full overflow-hidden bg-map-land ${placing ? "cursor-crosshair" : ""}`}
      data-testid="calgary-canvas"
      data-map-mode={loaded ? "mapbox" : "preview"}
    >
      <div
        className={`city-preview absolute inset-0 ${journey.phase === "revealing" ? "city-preview-arriving" : ""}`}
      >
        <div className="absolute" style={preview}>
          <CityIllustration className="size-full" />
        </div>
      </div>
      <div
        ref={container}
        className={`absolute inset-0 transition-opacity duration-500 ${loaded ? "opacity-100" : "pointer-events-none opacity-0"}`}
        aria-label="Calgary street map"
      />
      {!loaded && (
        <div
          className="absolute inset-0"
          onClick={(event) => {
            if (!placing) return;
            const box = event.currentTarget.getBoundingClientRect();
            onPick(
              previewPoint(
                (event.clientX - box.left - preview.left) / preview.width,
                (event.clientY - box.top - preview.top) / preview.height,
              ),
            );
          }}
          aria-hidden="true"
        />
      )}
      <div
        className={`pointer-events-none absolute inset-0 ${!loaded && journey.phase === "revealing" ? "city-preview-arriving" : ""}`}
      >
        {jobs.map((job) => {
          const point = loaded ? positions[job.id] : previewPosition(job);
          if (!point) return null;
          return (
            <div
              key={job.id}
              className="pointer-events-auto absolute -translate-x-1/2 -translate-y-full"
              style={{
                left: loaded
                  ? point.x
                  : preview.left + (point.x / 100) * preview.width,
                top: loaded
                  ? point.y
                  : preview.top + (point.y / 100) * preview.height,
              }}
            >
              <JobMarker
                job={job}
                selected={selectedId === job.id}
                onSelect={onSelect}
              />
            </div>
          );
        })}
      </div>
      <div className="pointer-events-none absolute start-5 top-5 flex items-center gap-2 rounded-xl border bg-card/95 px-4 py-3 shadow-sm">
        <CompassIcon aria-hidden="true" className="size-5 text-primary" />
        <span className="text-sm font-semibold">Calgary, AB</span>
        <span className="border-s ps-2 font-mono text-[.65rem] text-muted-foreground">
          51.0447° N
        </span>
      </div>
      {loaded && (
        <Button
          size="icon-lg"
          variant="outline"
          className="absolute end-5 top-5 bg-card"
          onClick={recenter}
          aria-label="Recenter Calgary map"
        >
          <RotateCcwIcon aria-hidden="true" />
        </Button>
      )}
      {!loaded && (
        <p className="absolute start-3 bottom-3 max-w-[min(19rem,calc(100%-5rem))] rounded-lg border bg-card/95 px-3 py-2 text-[.65rem] leading-4 text-muted-foreground">
          {failed
            ? "Street map unavailable. Showing an illustrated Calgary preview."
            : token
              ? "Loading the Calgary street map..."
              : "Illustrated Calgary preview. Configure a Mapbox public token for the live street map."}
        </p>
      )}
    </div>
  );
}

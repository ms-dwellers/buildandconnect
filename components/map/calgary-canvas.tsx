"use client";

import { useEffect, useRef, useState } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import { CompassIcon, LayersIcon, RotateCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mapboxToken } from "@/lib/api";
import {
  previewPoint,
  previewPosition,
  previewViewport,
  type CityJob,
  type CityPoint,
} from "@/lib/calgary";
import { CityIllustration } from "./city-illustration";
import { JobMarker } from "./job-marker";
import { LiveJobMarker } from "./live-job-marker";
import { useCalgaryMap } from "./use-calgary-map";
import { MapClouds, useMapJourney } from "./map-journey";
import { cityMapMode } from "@/lib/calgary-map";

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
  const { phase, ready } = useMapJourney();
  const container = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 1000, height: 700 });
  const selectedJob = jobs.find((job) => job.id === selectedId);
  const preview = previewViewport(size.width, size.height, selectedJob);
  const token = mapboxToken();
  const { live, failed, warning, camera, showCity, retry } = useCalgaryMap({
    container,
    token,
    jobs,
    selectedJob,
    placing,
    arriving: phase !== "idle",
    onPick,
    onSelect,
  });
  const mode = cityMapMode({
    hasToken: Boolean(token),
    ready: Boolean(live),
    failed,
  });
  const loading = mode === "loading";
  useEffect(() => {
    if (!loading) ready();
  }, [loading, ready]);
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

  return (
    <div
      className={`relative isolate size-full overflow-hidden bg-map-land ${placing ? "cursor-crosshair" : ""}`}
      data-testid="calgary-canvas"
      data-map-mode={mode}
      aria-busy={loading}
      data-map-zoom={camera.zoom.toFixed(2)}
      data-map-pitch={camera.pitch.toFixed(0)}
      data-map-moving={camera.moving}
    >
      {mode === "preview" && (
        <div
          className={`city-preview absolute inset-0 ${phase === "revealing" ? "city-preview-arriving" : ""}`}
        >
          <div className="absolute" style={preview}>
            <CityIllustration className="size-full" />
          </div>
        </div>
      )}
      <div
        ref={container}
        className={`absolute inset-0 ${live ? "opacity-100" : "pointer-events-none opacity-0"}`}
        aria-label="Interactive Calgary city map"
      />
      {mode === "preview" && (
        <>
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
          <div className="pointer-events-none absolute inset-0">
            {jobs.map((job) => {
              const point = previewPosition(job);
              return (
                <div
                  key={job.id}
                  className="pointer-events-auto absolute -translate-x-1/2 -translate-y-full"
                  style={{
                    left: preview.left + (point.x / 100) * preview.width,
                    top: preview.top + (point.y / 100) * preview.height,
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
        </>
      )}
      {live && selectedJob && (
        <LiveJobMarker
          key={selectedJob.id}
          live={live}
          job={selectedJob}
          showDetails={!camera.moving && camera.settledJobId === selectedJob.id}
          onSelect={onSelect}
        />
      )}
      <div className="pointer-events-none absolute start-4 top-4 flex items-center gap-2 rounded-xl border bg-card/95 px-4 py-3 shadow-sm">
        <CompassIcon aria-hidden="true" className="size-5 text-primary" />
        <span className="text-sm font-semibold">Calgary, AB</span>
      </div>
      {loading && (
        <div
          className="map-loading-clouds"
          data-testid="map-loading-clouds"
          role="status"
        >
          <MapClouds />
          <span className="sr-only">Loading Calgary&apos;s city map.</span>
        </div>
      )}
      {live && (
        <Button
          variant="outline"
          className="absolute end-4 top-4 bg-card"
          onClick={showCity}
        >
          <RotateCcwIcon aria-hidden="true" />
          All Calgary
        </Button>
      )}
      {live && (
        <div className="pointer-events-none absolute start-4 bottom-12 flex max-w-[calc(100%-4.5rem)] flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border bg-card/95 px-3 py-2 text-xs shadow-sm">
          <span className="flex items-center gap-1.5">
            <span className="map-key map-key-paid">P</span>Paid
          </span>
          <span className="flex items-center gap-1.5">
            <span className="map-key map-key-volunteer">V</span>Volunteer
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <LayersIcon aria-hidden="true" className="size-3.5" />
            {camera.pitch >= 30 ? "3D view" : "City overview"}
          </span>
        </div>
      )}
      <p role="status" className="sr-only">
        {live && selectedJob
          ? camera.moving
            ? `Flying to ${selectedJob.neighbourhood}.`
            : `3D neighbourhood view of ${selectedJob.neighbourhood}.`
          : ""}
      </p>
      {!loading && (!live || warning) && (
        <div className="absolute start-3 bottom-3 max-w-[min(24rem,calc(100%-4rem))] rounded-lg border bg-card/95 px-3 py-2 text-xs leading-5 text-muted-foreground">
          <p>
            {failed
              ? "Map unavailable. Showing a 2D illustrated preview."
              : live
                ? "Some map detail could not load."
                : "2D illustrated preview. Add a Mapbox public token for the full city and 3D buildings."}
          </p>
          {(failed || warning) && (
            <Button variant="link" size="sm" className="px-0" onClick={retry}>
              Retry live map
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import { BoxIcon, CompassIcon, LayersIcon, RotateCcwIcon } from "lucide-react";
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
import { useMapJourney } from "./map-journey";
import { cityMapMode } from "@/lib/calgary-map";

export function CalgaryCanvas({
  jobs,
  selectedId,
  onSelect,
  placing,
  onPick,
  renderActions,
}: {
  jobs: CityJob[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  placing: boolean;
  onPick: (point: CityPoint) => void;
  renderActions?: (job: CityJob) => ReactNode;
}) {
  const { phase, ready } = useMapJourney();
  const frame = useRef<HTMLDivElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 1000, height: 700 });
  const selectedJob = jobs.find((job) => job.id === selectedId);
  const preview = previewViewport(size.width, size.height, selectedJob);
  const token = mapboxToken();
  const { live, failed, warning, camera, showCity, retry, togglePerspective } =
    useCalgaryMap({
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
    if (!frame.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      }),
    );
    observer.observe(frame.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={frame}
      className={`relative isolate size-full overflow-hidden bg-map-land ${placing ? "cursor-crosshair" : ""}`}
      data-testid="calgary-canvas"
      role="region"
      aria-label="Calgary project map"
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
        className={`absolute inset-0 size-full ${live ? "opacity-100" : "pointer-events-none opacity-0"}`}
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
                    actions={renderActions?.(job)}
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
          actions={renderActions?.(selectedJob)}
        />
      )}
      <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-3 sm:inset-x-5 sm:top-5">
        <div className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl border bg-card/95 px-3 shadow-card backdrop-blur-sm sm:px-4">
          <CompassIcon aria-hidden="true" className="size-5 text-primary" />
          <span className="text-sm font-semibold">
            Calgary<span className="hidden sm:inline">, AB</span>
          </span>
        </div>
        {live && (
          <div className="pointer-events-auto flex gap-2">
            <Button
              variant="outline"
              className="min-h-11 bg-card aria-pressed:border-primary aria-pressed:bg-secondary"
              aria-label="3D view"
              aria-pressed={camera.pitch >= 30}
              onClick={togglePerspective}
            >
              <BoxIcon aria-hidden="true" />
              3D<span className="hidden sm:inline"> view</span>
            </Button>
            <Button
              variant="outline"
              className="min-h-11 bg-card"
              aria-label="All Calgary"
              onClick={showCity}
            >
              <RotateCcwIcon aria-hidden="true" />
              <span className="hidden sm:inline">All Calgary</span>
            </Button>
          </div>
        )}
      </div>
      {loading && phase === "idle" && (
        <div className="map-loading" data-testid="map-loading" role="status">
          <span>Loading Calgary&apos;s map…</span>
        </div>
      )}
      {live && (
        <div className="pointer-events-none absolute start-3 bottom-12 flex max-w-[calc(100%-5rem)] flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border bg-card/95 px-3 py-2.5 text-xs shadow-card backdrop-blur-sm sm:start-5">
          <span className="flex items-center gap-1.5">
            <span className="map-key map-key-paid">P</span>Paid
          </span>
          <span className="flex items-center gap-1.5">
            <span className="map-key map-key-volunteer">V</span>Volunteer
          </span>
          <span className="flex items-center gap-1.5">
            <span className="map-key map-key-community">R</span>Community
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
            : `${camera.pitch >= 30 ? "3D neighbourhood" : "Overhead"} view of ${selectedJob.neighbourhood}.`
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

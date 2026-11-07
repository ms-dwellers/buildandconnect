"use client";

import { useEffect, useRef, useState } from "react";
import type { GeoJSONSource, Map as MapboxMap, Marker } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { CircleAlertIcon, SearchIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mapboxToken } from "@/lib/api";
import { CALGARY_BOUNDS, CALGARY_CENTER } from "@/lib/calgary-area";

export type Pin = {
  latitude: number;
  longitude: number;
  place: string;
};

type Props = {
  value: Pin | null;
  onChange: (pin: Pin) => void;
  radiusKm?: number;
  className?: string;
};

const RADIUS_SOURCE = "pin-radius";

export function MapPinPicker({ value, onChange, radiusKm, className }: Props) {
  const token = mapboxToken();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const markerClass = useRef<typeof Marker | null>(null);
  const [ready, setReady] = useState(false);
  // Map listeners are bound once; read the latest props through a ref.
  const latest = useRef({ value, onChange });
  latest.current = { value, onChange };
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !containerRef.current) return;
    let disposed = false;
    let map: MapboxMap | undefined;
    void import("mapbox-gl").then(({ default: sdk }) => {
      if (disposed || !containerRef.current) return;
      const start = latest.current.value ?? CALGARY_CENTER;
      map = new sdk.Map({
        container: containerRef.current,
        accessToken: token,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [start.longitude, start.latitude],
        zoom: latest.current.value ? 13 : 10.3,
      });
      markerClass.current = sdk.Marker;
      map.addControl(new sdk.NavigationControl({ showCompass: false }));
      map.on("error", () =>
        setMapError(
          "Some of the map could not load. Search still works, or try again later.",
        ),
      );
      map.on("load", () => {
        setMapError(null);
        setReady(true);
      });
      map.on("click", (event) => {
        latest.current.onChange({
          latitude: event.lngLat.lat,
          longitude: event.lngLat.lng,
          place: latest.current.value?.place || "Dropped pin",
        });
      });
      mapRef.current = map;
    });
    return () => {
      disposed = true;
      map?.remove();
      mapRef.current = null;
      markerRef.current = null;
      setReady(false);
    };
  }, [token]);

  useEffect(() => {
    const map = mapRef.current;
    const MarkerClass = markerClass.current;
    if (!map || !ready || !MarkerClass) return;
    if (!value) {
      markerRef.current?.remove();
      markerRef.current = null;
      if (map.getLayer(`${RADIUS_SOURCE}-fill`))
        map.removeLayer(`${RADIUS_SOURCE}-fill`);
      if (map.getSource(RADIUS_SOURCE)) map.removeSource(RADIUS_SOURCE);
      return;
    }
    const primary = getComputedStyle(map.getContainer())
      .getPropertyValue("--primary")
      .trim();
    if (!markerRef.current)
      markerRef.current = new MarkerClass({ color: primary })
        .setLngLat([value.longitude, value.latitude])
        .addTo(map);
    else markerRef.current.setLngLat([value.longitude, value.latitude]);
    map.easeTo({ center: [value.longitude, value.latitude] });
    if (radiusKm == null) return;
    const data = {
      type: "Feature" as const,
      geometry: {
        type: "Polygon" as const,
        coordinates: [circleRing(value.longitude, value.latitude, radiusKm)],
      },
      properties: {},
    };
    const source = map.getSource<GeoJSONSource>(RADIUS_SOURCE);
    if (source) source.setData(data);
    else {
      map.addSource(RADIUS_SOURCE, { type: "geojson", data });
      map.addLayer({
        id: `${RADIUS_SOURCE}-fill`,
        type: "fill",
        source: RADIUS_SOURCE,
        paint: { "fill-color": primary, "fill-opacity": 0.12 },
      });
    }
  }, [value, radiusKm, ready]);

  async function searchPlace() {
    if (!token || !query.trim()) return;
    setSearching(true);
    setSearchError(null);
    const url = new URL(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query.trim())}.json`,
    );
    url.searchParams.set("access_token", token);
    url.searchParams.set("limit", "1");
    url.searchParams.set("country", "ca");
    url.searchParams.set(
      "proximity",
      `${CALGARY_CENTER.longitude},${CALGARY_CENTER.latitude}`,
    );
    url.searchParams.set("bbox", CALGARY_BOUNDS.flat().join(","));
    const response = await fetch(url).catch(() => null);
    setSearching(false);
    if (!response?.ok) {
      setSearchError(
        "Place search failed. Check your connection and try again.",
      );
      return;
    }
    const body = (await response.json()) as {
      features?: {
        place_name: string;
        text: string;
        center: [number, number];
      }[];
    };
    const hit = body.features?.[0];
    if (!hit) {
      setSearchError("No place in Calgary matches that search.");
      return;
    }
    onChange({
      longitude: hit.center[0],
      latitude: hit.center[1],
      place: hit.text,
    });
    setQuery(hit.place_name);
  }

  if (!token)
    return (
      <Alert variant="warning">
        <CircleAlertIcon aria-hidden="true" />
        <AlertDescription>
          Location picking needs a Mapbox public token. Set{" "}
          <code>NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN</code> in{" "}
          <code>.env.local</code>.
        </AlertDescription>
      </Alert>
    );

  return (
    <div className={className}>
      <div role="search" className="mb-3 flex gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void searchPlace();
            }
          }}
          placeholder="Search a Calgary address or place"
          aria-label="Search for a place in Calgary"
        />
        <Button
          variant="outline"
          loading={searching}
          onClick={() => void searchPlace()}
        >
          <SearchIcon aria-hidden="true" />
          Search
        </Button>
      </div>
      {searchError && (
        <p role="alert" className="mb-2 text-sm text-destructive-foreground">
          {searchError}
        </p>
      )}
      <div
        ref={containerRef}
        className="h-80 overflow-hidden rounded-xl border"
        aria-label="Map for choosing a location. Click to drop a pin."
      />
      {mapError && (
        <p role="alert" className="mt-2 text-sm text-destructive-foreground">
          {mapError}
        </p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        Search, or click the map to drop a pin.
      </p>
    </div>
  );
}

function circleRing(
  longitude: number,
  latitude: number,
  radiusKm: number,
  points = 64,
): [number, number][] {
  const coordinates: [number, number][] = [];
  for (let index = 0; index <= points; index++) {
    const bearing = (index / points) * 2 * Math.PI;
    const lat = latitude + (radiusKm / 111.32) * Math.cos(bearing);
    const lng =
      longitude +
      (radiusKm / (111.32 * Math.cos((latitude * Math.PI) / 180))) *
        Math.sin(bearing);
    coordinates.push([lng, lat]);
  }
  return coordinates;
}

"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { mapboxToken } from "../lib/api.ts";

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

const DEFAULT_CENTER: [number, number] = [-79.3832, 43.6532];

export function MapPinPicker({ value, onChange, radiusKm, className }: Props) {
  const token = mapboxToken();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const circleRef = useRef<string | null>(null);
  const [query, setQuery] = useState(value?.place ?? "");
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: value ? [value.longitude, value.latitude] : DEFAULT_CENTER,
      zoom: 11,
    });
    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.on("click", (event) => {
      onChange({
        latitude: event.lngLat.lat,
        longitude: event.lngLat.lng,
        place: value?.place || "Selected location",
      });
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      circleRef.current = null;
    };
  }, [token]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !value) return;
    if (!markerRef.current) {
      markerRef.current = new mapboxgl.Marker({ color: "#047857" })
        .setLngLat([value.longitude, value.latitude])
        .addTo(map);
    } else {
      markerRef.current.setLngLat([value.longitude, value.latitude]);
    }
    map.easeTo({ center: [value.longitude, value.latitude] });

    const sourceId = "pin-radius";
    const layerId = "pin-radius-fill";
    const drawCircle = () => {
      if (radiusKm == null) return;
      const data = {
        type: "Feature" as const,
        geometry: {
          type: "Polygon" as const,
          coordinates: [circleRing(value.longitude, value.latitude, radiusKm)],
        },
        properties: {},
      };
      if (map.getSource(sourceId)) {
        (map.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(data);
      } else {
        map.addSource(sourceId, { type: "geojson", data });
        map.addLayer({
          id: layerId,
          type: "fill",
          source: sourceId,
          paint: {
            "fill-color": "#047857",
            "fill-opacity": 0.12,
          },
        });
        circleRef.current = layerId;
      }
    };
    if (map.isStyleLoaded()) drawCircle();
    else map.once("load", drawCircle);
  }, [value, radiusKm]);

  async function searchPlace(event: React.FormEvent) {
    event.preventDefault();
    if (!token || !query.trim()) return;
    setSearchError(null);
    const url = new URL(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query.trim())}.json`,
    );
    url.searchParams.set("access_token", token);
    url.searchParams.set("limit", "1");
    const response = await fetch(url);
    if (!response.ok) {
      setSearchError("Place search failed. Try another query.");
      return;
    }
    const body = (await response.json()) as {
      features?: { place_name: string; center: [number, number] }[];
    };
    const hit = body.features?.[0];
    if (!hit) {
      setSearchError("No matching place found.");
      return;
    }
    onChange({
      longitude: hit.center[0],
      latitude: hit.center[1],
      place: hit.place_name,
    });
    setQuery(hit.place_name);
  }

  if (!token) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        Set <code>NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN</code> in a local env file to
        enable the map.
      </div>
    );
  }

  return (
    <div className={className}>
      <form onSubmit={searchPlace} className="mb-3 flex gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search for a place"
          className="min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm"
          aria-label="Search for a place"
        />
        <button
          type="submit"
          className="rounded-xl bg-emerald-800 px-4 py-2 text-sm font-medium text-white"
        >
          Search
        </button>
      </form>
      {searchError ? (
        <p className="mb-2 text-sm text-red-700">{searchError}</p>
      ) : null}
      <div
        ref={containerRef}
        className="h-80 overflow-hidden rounded-2xl border border-stone-200"
      />
      <p className="mt-2 text-sm text-stone-600">
        Click the map to drop a pin
        {radiusKm != null ? `, or adjust your ${radiusKm} km radius.` : "."}
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

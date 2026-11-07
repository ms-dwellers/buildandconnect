"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { mapboxToken } from "../lib/api.ts";

export type NearbyRequest = {
  requestId: string;
  title: string;
  place: string;
  latitude: number;
  longitude: number;
  score: number;
  distanceKm: number;
};

type Props = {
  center: { latitude: number; longitude: number };
  requests: NearbyRequest[];
  selectedId: string | null;
  onSelect: (requestId: string) => void;
  className?: string;
};

export function NearbyRequestsMap({
  center,
  requests,
  selectedId,
  onSelect,
  className,
}: Props) {
  const token = mapboxToken();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!token || !containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [center.longitude, center.latitude],
      zoom: 11,
    });
    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    new mapboxgl.Marker({ color: "#1e3a8a" })
      .setLngLat([center.longitude, center.latitude])
      .setPopup(new mapboxgl.Popup().setText("Your pin"))
      .addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = [];
    };
  }, [token, center.latitude, center.longitude]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    for (const marker of markersRef.current) marker.remove();
    markersRef.current = requests.map((request) => {
      const marker = new mapboxgl.Marker({
        color: request.requestId === selectedId ? "#b45309" : "#047857",
      })
        .setLngLat([request.longitude, request.latitude])
        .setPopup(
          new mapboxgl.Popup().setText(
            `${request.title} · ${request.score}% · ${request.distanceKm} km`,
          ),
        )
        .addTo(map);
      marker.getElement().style.cursor = "pointer";
      marker.getElement().addEventListener("click", () => {
        onSelect(request.requestId);
      });
      return marker;
    });
  }, [requests, selectedId, onSelect]);

  if (!token) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        Set <code>NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN</code> in a local env file to
        enable the map.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`h-96 overflow-hidden rounded-2xl border border-stone-200 ${className ?? ""}`}
    />
  );
}

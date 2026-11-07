"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { CityJob } from "@/lib/calgary";
import { JobMarker } from "./job-marker";
import type { LiveCityMap } from "./use-calgary-map";

// Let Mapbox project the selected marker through camera motion. React does not
// rerender the whole project list or every marker on each animation frame.
export function LiveJobMarker({
  live,
  job,
  showDetails,
  onSelect,
  actions,
}: {
  live: LiveCityMap;
  job: CityJob;
  showDetails: boolean;
  onSelect: (id: string | null) => void;
  actions?: ReactNode;
}) {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    const target = document.createElement("div");
    target.className = "city-selected-marker";
    const marker = new live.Marker({
      element: target,
      anchor: "bottom",
      pitchAlignment: "viewport",
      rotationAlignment: "viewport",
      occludedOpacity: 1,
    })
      .setLngLat([job.longitude, job.latitude])
      .addTo(live.map);
    setElement(target);
    return () => {
      marker.remove();
      setElement(null);
    };
  }, [live, job.longitude, job.latitude]);
  return element
    ? createPortal(
        <JobMarker
          job={job}
          selected
          showDetails={showDetails}
          onSelect={onSelect}
          actions={actions}
        />,
        element,
      )
    : null;
}

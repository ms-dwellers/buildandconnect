"use client";

import type { ReactNode } from "react";
import {
  BriefcaseBusinessIcon,
  HandHelpingIcon,
  HeartHandshakeIcon,
  MapPinIcon,
  XIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverPopup,
  PopoverTitle,
  PopoverDescription,
  PopoverClose,
} from "@/components/ui/popover";
import type { CityJob } from "@/lib/calgary";

export function JobMarker({
  job,
  selected,
  showDetails = true,
  onSelect,
  actions,
}: {
  job: CityJob;
  selected: boolean;
  showDetails?: boolean;
  onSelect: (id: string | null) => void;
  actions?: ReactNode;
}) {
  const Icon = markerIcon(job);
  return (
    <Popover
      open={selected && showDetails}
      onOpenChange={(open) => onSelect(open ? job.id : null)}
    >
      <PopoverTrigger
        render={
          <Button
            variant={job.kind === "paid" ? "default" : "secondary"}
            size="icon-lg"
            className={`map-job-marker ${selected ? "map-job-marker-selected" : ""}`}
            aria-label={`${job.title} in ${job.neighbourhood}`}
            onClick={(event) => event.stopPropagation()}
          />
        }
      >
        <Icon aria-hidden="true" className="size-5" />
      </PopoverTrigger>
      <PopoverPopup
        side="top"
        sideOffset={14}
        className="w-80 max-w-[calc(100vw-2rem)] rounded-2xl"
      >
        <div className="space-y-4 pe-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={job.kind === "paid" ? "outline" : "secondary"}>
              {listingLabel(job)}
            </Badge>
            {job.status === "claimed" && <Badge variant="info">Accepted</Badge>}
            {job.mentorship && (
              <span className="text-xs text-primary">Mentorship offered</span>
            )}
          </div>
          <div className="space-y-2">
            <PopoverTitle className="pe-2 text-lg leading-6">
              {job.title}
            </PopoverTitle>
            <p className="text-sm text-muted-foreground">{job.organization}</p>
          </div>
          <PopoverDescription className="leading-6">
            {job.description}
          </PopoverDescription>
          <dl className="grid grid-cols-2 gap-3 border-y py-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Compensation</dt>
              <dd className="mt-1 font-medium">{job.compensation}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Commitment</dt>
              <dd className="mt-1 font-medium">{job.commitment}</dd>
            </div>
          </dl>
          {job.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {job.skills.map((skill) => (
                <Badge variant="outline" key={skill}>
                  {skill}
                </Badge>
              ))}
            </div>
          )}
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPinIcon aria-hidden="true" className="size-3.5" />
            {job.precise
              ? `${job.neighbourhood}, Calgary`
              : "Approximate location, within about 1 km"}
          </p>
          {actions}
        </div>
        <PopoverClose
          render={
            <Button
              variant="ghost"
              size="icon-xs"
              className="absolute end-2 top-2"
              aria-label="Close job details"
            />
          }
        >
          <XIcon aria-hidden="true" />
        </PopoverClose>
      </PopoverPopup>
    </Popover>
  );
}

export function markerIcon(job: CityJob) {
  if (job.source === "request") return HandHelpingIcon;
  return job.kind === "paid" ? BriefcaseBusinessIcon : HeartHandshakeIcon;
}

export function listingLabel(job: CityJob) {
  if (job.source === "request") return "Community request";
  return job.kind === "paid" ? "Paid project" : "Volunteer";
}

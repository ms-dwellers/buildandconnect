"use client";

import {
  BriefcaseBusinessIcon,
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
}: {
  job: CityJob;
  selected: boolean;
  showDetails?: boolean;
  onSelect: (id: string | null) => void;
}) {
  const Icon = job.kind === "paid" ? BriefcaseBusinessIcon : HeartHandshakeIcon;
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
            <Badge variant={job.kind === "paid" ? "success" : "secondary"}>
              {job.kind === "paid" ? "Paid project" : "Volunteer"}
            </Badge>
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
          <div className="flex flex-wrap gap-1.5">
            {job.skills.map((skill) => (
              <Badge variant="outline" key={skill}>
                {skill}
              </Badge>
            ))}
          </div>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPinIcon aria-hidden="true" className="size-3.5" />
            {job.neighbourhood}, Calgary
          </p>
          <p className="text-xs leading-5 text-muted-foreground">
            Demo listing. Applications are not enabled.
          </p>
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

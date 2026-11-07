"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  ArrowLeftIcon,
  ArrowUpRightIcon,
  BriefcaseBusinessIcon,
  HeartHandshakeIcon,
  MapPinIcon,
  PlusIcon,
  SearchIcon,
  SproutIcon,
  XIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CALGARY_CENTER,
  CALGARY_JOBS,
  filterCityJobs,
  type CityJob,
  type CityPoint,
} from "@/lib/calgary";
import { CalgaryCanvas } from "./calgary-canvas";
import { DemoJobDialog } from "./demo-job-dialog";

export function CalgaryExplorer() {
  const [jobs, setJobs] = useState(CALGARY_JOBS);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | CityJob["kind"]>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [draftLocation, setDraftLocation] = useState<CityPoint | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const mapSection = useRef<HTMLElement>(null);
  const selectJob = useCallback((id: string | null) => {
    setSelectedId(id);
    if (id && window.matchMedia("(max-width: 1023px)").matches)
      mapSection.current?.scrollIntoView({
        block: "start",
        behavior: "instant",
      });
  }, []);
  const visibleJobs = useMemo(
    () => filterCityJobs(jobs, query, kind),
    [jobs, query, kind],
  );
  const pickLocation = useCallback(
    (point: CityPoint) => {
      if (placing) {
        setDraftLocation(point);
        setPlacing(false);
      }
    },
    [placing],
  );
  function addJob(job: CityJob) {
    setJobs((current) => [job, ...current]);
    setQuery("");
    setKind("all");
    setDraftLocation(null);
    selectJob(job.id);
    setAnnouncement(
      "Demo job added at your Calgary pin. It will disappear when this page is refreshed.",
    );
  }
  return (
    <div className="flex min-h-svh flex-col bg-background lg:h-svh lg:min-h-[42rem] lg:overflow-hidden">
      <Button
        render={<a href="#calgary-map-title" />}
        className="fixed start-4 top-4 z-50 -translate-y-24 focus-visible:translate-y-0"
      >
        Skip to projects
      </Button>
      <header className="flex min-h-20 flex-wrap items-center justify-between gap-3 border-b bg-card px-5 py-4 sm:px-8">
        <Button render={<a href="/" />} variant="ghost" className="gap-3 px-0">
          <SproutIcon aria-hidden="true" className="size-7 text-primary" />
          <span className="text-base tracking-tight">Build &amp; Connect</span>
        </Button>
        <nav
          aria-label="Map navigation"
          className="flex items-center gap-2 sm:gap-4"
        >
          <Button render={<a href="/" />} variant="ghost">
            <ArrowLeftIcon aria-hidden="true" />
            Home
          </Button>
          <Button
            onClick={() => {
              setPlacing(true);
              setSelectedId(null);
            }}
          >
            <PlusIcon aria-hidden="true" />
            Add demo job
          </Button>
        </nav>
      </header>
      <main className="grid flex-1 lg:min-h-0 lg:grid-cols-[23rem_minmax(0,1fr)] lg:overflow-hidden">
        <aside
          className="order-2 flex min-h-0 flex-col border-t bg-card lg:order-1 lg:border-t-0 lg:border-e"
          aria-label="Calgary projects"
        >
          <div className="space-y-5 p-6">
            <h1
              id="calgary-map-title"
              tabIndex={-1}
              className="font-display text-[2.5rem] leading-[1.08] tracking-tight outline-none"
            >
              Good work.
              <br />
              Close to home.
            </h1>
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
                <MapPinIcon aria-hidden="true" className="size-3.5" />
                Calgary, Alberta
              </p>
              <Badge variant="secondary">Frontend demo</Badge>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              A new skill, a shared purpose, a neighbour worth knowing. Find
              your starting point.
            </p>
            <div className="space-y-2">
              <Label htmlFor="city-job-search" className="sr-only">
                Search Calgary projects
              </Label>
              <Input
                id="city-job-search"
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSelectedId(null);
                }}
                placeholder="Try React, Inglewood, or design"
                className="bg-background"
              />
            </div>
            <div
              role="group"
              aria-label="Filter projects by type"
              className="flex flex-wrap gap-2"
            >
              {(["all", "paid", "volunteer"] as const).map((value) => (
                <Button
                  key={value}
                  size="sm"
                  variant={kind === value ? "secondary" : "ghost"}
                  aria-pressed={kind === value}
                  onClick={() => {
                    setKind(value);
                    setSelectedId(null);
                  }}
                >
                  {value === "all"
                    ? "All projects"
                    : value === "paid"
                      ? "Paid"
                      : "Volunteer"}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between border-y px-6 py-3 text-xs text-muted-foreground">
            <p role="status">
              {visibleJobs.length}{" "}
              {visibleJobs.length === 1 ? "project" : "projects"} in Calgary
            </p>
            <span>Select a pin for 3D</span>
          </div>
          <ol
            className="max-h-[32rem] min-h-0 flex-1 divide-y overflow-y-auto overscroll-contain lg:max-h-none"
            aria-label="Project list"
          >
            {visibleJobs.map((job) => {
              const Icon =
                job.kind === "paid"
                  ? BriefcaseBusinessIcon
                  : HeartHandshakeIcon;
              return (
                <li key={job.id}>
                  <Button
                    variant="ghost"
                    className={`h-auto w-full items-start justify-start gap-3 rounded-none px-6 py-5 text-start whitespace-normal ${selectedId === job.id ? "bg-accent" : ""}`}
                    aria-label={`View ${job.title}`}
                    aria-pressed={selectedId === job.id}
                    onClick={() =>
                      selectJob(selectedId === job.id ? null : job.id)
                    }
                  >
                    <span
                      className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg ${job.kind === "paid" ? "bg-primary/10 text-primary" : "bg-secondary text-secondary-foreground"}`}
                    >
                      <Icon aria-hidden="true" className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1 space-y-2">
                      <span className="block text-xs font-normal text-muted-foreground">
                        {job.neighbourhood} · {job.organization}
                      </span>
                      <span className="block text-sm leading-5 font-semibold">
                        {job.title}
                      </span>
                      <span className="block text-xs font-normal text-primary">
                        {job.compensation}
                        <span className="text-muted-foreground">
                          {" "}
                          · {job.commitment}
                        </span>
                      </span>
                      <span className="block text-[.65rem] font-normal text-muted-foreground">
                        {job.skills.join(" / ")}
                      </span>
                    </span>
                    <ArrowUpRightIcon
                      aria-hidden="true"
                      className="mt-1 size-3.5 shrink-0 text-muted-foreground"
                    />
                  </Button>
                </li>
              );
            })}
            {!visibleJobs.length && (
              <li className="space-y-3 p-6">
                <SearchIcon
                  aria-hidden="true"
                  className="size-6 text-muted-foreground"
                />
                <h2 className="font-semibold">No projects match yet</h2>
                <p className="text-sm text-muted-foreground">
                  Try another skill or neighbourhood, or clear your filters.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setQuery("");
                    setKind("all");
                  }}
                >
                  Clear filters
                </Button>
              </li>
            )}
          </ol>
          <p className="border-t px-6 py-3 text-[.65rem] leading-5 text-muted-foreground">
            Illustrative jobs and organisations, not live vacancies. No sign-in
            or backend connection required.
          </p>
        </aside>
        <section
          ref={mapSection}
          aria-label="Calgary job map"
          className="relative order-1 h-[65svh] min-h-[27rem] lg:order-2 lg:h-full lg:min-h-0"
        >
          <CalgaryCanvas
            jobs={visibleJobs}
            selectedId={selectedId}
            onSelect={selectJob}
            placing={placing}
            onPick={pickLocation}
          />
          {placing && (
            <div className="absolute start-1/2 top-24 z-10 w-[min(27rem,calc(100%-2rem))] -translate-x-1/2 space-y-3 rounded-xl border bg-card p-4 shadow-lg">
              <div className="flex items-start justify-between gap-3">
                <p role="status" className="text-sm font-medium">
                  Choose a Calgary location on the map.
                </p>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  onClick={() => setPlacing(false)}
                  aria-label="Cancel placing job"
                >
                  <XIcon aria-hidden="true" />
                </Button>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setDraftLocation(CALGARY_CENTER);
                  setPlacing(false);
                }}
              >
                Use downtown Calgary
              </Button>
            </div>
          )}
        </section>
      </main>
      <p role="status" className="sr-only">
        {announcement}
      </p>
      <DemoJobDialog
        location={draftLocation}
        onClose={() => setDraftLocation(null)}
        onAdd={addJob}
      />
    </div>
  );
}

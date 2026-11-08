"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRightIcon,
  MapPinIcon,
  PlusIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ToggleGroup,
  ToggleGroupItem,
  ToggleGroupSeparator,
} from "@/components/ui/toggle-group";
import { AppHeader } from "@/components/app/app-shell";
import { ErrorAlert } from "@/components/app/require-role";
import {
  CALGARY_CENTER,
  filterCityJobs,
  type CityPoint,
  type MapFilter,
} from "@/lib/calgary";
import { useSession } from "@/lib/session";
import { useApi } from "@/lib/use-api";
import type { MapFeed, Role } from "@/lib/types";
import { CalgaryCanvas } from "./calgary-canvas";
import { listingLabel, markerIcon } from "./job-marker";
import { ListingActions } from "./listing-actions";

const FILTERS: {
  value: Exclude<MapFilter, "all">;
  label: string;
  marker: string;
  markerClass: string;
}[] = [
  { value: "paid", label: "Paid", marker: "P", markerClass: "map-key-paid" },
  {
    value: "volunteer",
    label: "Volunteer",
    marker: "V",
    markerClass: "map-key-volunteer",
  },
  {
    value: "request",
    label: "Community",
    marker: "R",
    markerClass: "map-key-community",
  },
];

const POST_TARGET: Partial<Record<Role, { path: string; label: string }>> = {
  requester: { path: "/requests/new", label: "Post a request" },
};

export function CalgaryExplorer({ focus }: { focus: string | null }) {
  const { session } = useSession();
  const router = useRouter();
  const feed = useApi<MapFeed>("/map");
  // Viewer-specific fields (ownership, precision) change after sign-in/out.
  const sessionKey =
    session.status === "member" ? session.user.id : session.status;
  const reloadFeed = feed.reload;
  const seenSession = useRef(sessionKey);
  useEffect(() => {
    if (seenSession.current === sessionKey) return;
    seenSession.current = sessionKey;
    void reloadFeed();
  }, [sessionKey, reloadFeed]);
  const jobs = useMemo(() => feed.data?.listings ?? [], [feed.data]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<MapFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const mapSection = useRef<HTMLElement>(null);
  const role = session.status === "member" ? session.role : null;
  const post = role ? POST_TARGET[role] : undefined;

  const selectJob = useCallback((id: string | null) => {
    setSelectedId(id);
    if (id && window.matchMedia("(max-width: 1023px)").matches)
      mapSection.current?.scrollIntoView({
        block: "start",
        behavior: "instant",
      });
  }, []);
  const visibleJobs = useMemo(
    () => filterCityJobs(jobs, query, filter),
    [jobs, query, filter],
  );
  const focused = useRef(false);
  useEffect(() => {
    if (focused.current || !focus || !jobs.some((job) => job.id === focus))
      return;
    focused.current = true;
    selectJob(focus);
  }, [focus, jobs, selectJob]);

  const pickLocation = useCallback(
    (point: CityPoint) => {
      if (!placing || !post) return;
      setPlacing(false);
      router.push(
        `${post.path}?lat=${point.latitude.toFixed(6)}&lng=${point.longitude.toFixed(6)}`,
      );
    },
    [placing, post, router],
  );
  const approximate = visibleJobs.some((job) => !job.precise);

  return (
    <div className="map-workspace flex min-h-svh flex-col bg-background lg:h-svh lg:min-h-[42rem] lg:overflow-hidden">
      <a href="#calgary-map-title" className="landing-skip-link">
        Skip to projects
      </a>
      <AppHeader />
      <main className="grid flex-1 gap-3 p-3 lg:min-h-0 lg:grid-cols-[22rem_minmax(0,1fr)] lg:gap-4 lg:overflow-hidden lg:p-4">
        <aside
          className="order-2 flex min-h-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-card lg:order-1"
          aria-label="Calgary projects"
        >
          <div className="space-y-5 p-5 sm:p-6">
            <h1
              id="calgary-map-title"
              tabIndex={-1}
              className="font-display text-4xl leading-[1.08] tracking-tight outline-none"
            >
              Good work.
              <br />
              Close to home.
            </h1>
            <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
              <MapPinIcon aria-hidden="true" className="size-3.5" />
              Calgary, Alberta
            </p>
            {post && (
              <Button
                className="w-full"
                onClick={() => {
                  setPlacing(true);
                  setSelectedId(null);
                }}
              >
                <PlusIcon aria-hidden="true" />
                {post.label}
              </Button>
            )}
            <div className="space-y-2">
              <Label htmlFor="city-job-search" className="text-xs">
                Search Calgary projects
              </Label>
              <div className="relative">
                <SearchIcon
                  aria-hidden="true"
                  className="pointer-events-none absolute start-3 top-1/2 z-1 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="city-job-search"
                  type="search"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setSelectedId(null);
                  }}
                  placeholder="Try React, Inglewood, or design"
                  className="bg-card ps-9"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 px-5 pb-3 text-xs text-muted-foreground sm:px-6">
            <p role="status">
              {feed.data
                ? `${visibleJobs.length} ${visibleJobs.length === 1 ? "project" : "projects"}${feed.data.truncated ? " shown" : " in Calgary"}`
                : feed.loading
                  ? "Loading projects…"
                  : ""}
            </p>
          </div>
          {feed.data && feed.error && (
            <div className="px-5 pb-3">
              <ErrorAlert
                title="Projects could not be refreshed"
                message={feed.error.message}
                onRetry={() => void feed.reload()}
              />
            </div>
          )}
          {feed.data?.truncated && (
            <p className="px-5 pb-3 text-xs text-muted-foreground">
              More projects are available. These filters search the loaded
              results.
            </p>
          )}
          <ol
            className="max-h-[32rem] min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-3 pb-3 lg:max-h-none"
            aria-label="Project list"
            aria-busy={feed.loading || undefined}
          >
            {feed.error && !feed.data ? (
              <li className="p-6">
                <ErrorAlert
                  title="Projects could not be loaded"
                  message={feed.error.message}
                  onRetry={() => void feed.reload()}
                />
              </li>
            ) : !feed.data ? (
              Array.from({ length: 4 }, (_, index) => (
                <li key={index} className="space-y-2 px-6 py-5">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-4 w-56" />
                  <Skeleton className="h-3 w-40" />
                </li>
              ))
            ) : !jobs.length ? (
              <li className="space-y-3 p-6">
                <h2 className="font-semibold">Nothing posted yet</h2>
                <p className="text-sm text-muted-foreground">
                  {post
                    ? "Be the first. Choose a spot on the map for your post."
                    : "Projects appear here as requesters post them."}
                </p>
                {session.status === "guest" && (
                  <Button render={<a href="/sign-up" />} variant="outline">
                    Get started
                  </Button>
                )}
              </li>
            ) : !visibleJobs.length ? (
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
                    setFilter("all");
                  }}
                >
                  Clear filters
                </Button>
              </li>
            ) : (
              visibleJobs.map((job) => {
                const Icon = markerIcon(job);
                return (
                  <li key={job.id}>
                    <Button
                      variant="ghost"
                      className="h-auto w-full items-start justify-start gap-3 rounded-xl border border-transparent px-3 py-4 text-start whitespace-normal hover:bg-secondary/30 aria-pressed:border-primary/25 aria-pressed:bg-secondary/60"
                      aria-label={`View ${job.title}`}
                      aria-pressed={selectedId === job.id}
                      onClick={() =>
                        selectJob(selectedId === job.id ? null : job.id)
                      }
                    >
                      <span
                        className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg ${job.source === "request" ? "bg-(--map-community) text-foreground" : job.kind === "paid" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
                      >
                        <Icon aria-hidden="true" className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1 space-y-2">
                        <span className="block text-base leading-5 font-semibold">
                          {job.title}
                        </span>
                        <span className="block text-xs font-normal text-muted-foreground">
                          {job.neighbourhood} · {job.organization}
                        </span>
                        <span className="block text-xs font-normal text-primary">
                          {job.source === "request"
                            ? listingLabel(job)
                            : job.compensation}
                          <span className="text-muted-foreground">
                            {" "}
                            ·{" "}
                            {job.status === "claimed"
                              ? "Accepted"
                              : job.commitment}
                          </span>
                        </span>
                        {job.skills.length > 0 && (
                          <span className="block text-xs font-normal text-muted-foreground">
                            {job.skills.join(" · ")}
                          </span>
                        )}
                      </span>
                      <ArrowUpRightIcon
                        aria-hidden="true"
                        className="mt-1 size-3.5 shrink-0 text-muted-foreground"
                      />
                    </Button>
                  </li>
                );
              })
            )}
          </ol>
          {approximate && (
            <p className="border-t px-6 py-3 text-xs leading-5 text-muted-foreground">
              Community requests show an approximate area. Developers see the
              exact place.
            </p>
          )}
        </aside>
        <section
          ref={mapSection}
          aria-label="Calgary job map"
          className="relative order-1 h-[65svh] min-h-[27rem] overflow-hidden rounded-2xl border border-primary/15 shadow-card lg:order-2 lg:h-full lg:min-h-0"
        >
          <CalgaryCanvas
            jobs={visibleJobs}
            selectedId={selectedId}
            onSelect={selectJob}
            placing={placing}
            onPick={pickLocation}
            filters={
              <ToggleGroup
                variant="outline"
                size="sm"
                aria-label="Filter projects by type"
                value={filter === "all" ? [] : [filter]}
                onValueChange={(values) => {
                  setFilter(
                    FILTERS.find(({ value }) => value === values[0])?.value ??
                      "all",
                  );
                  setSelectedId(null);
                }}
              >
                {FILTERS.map(({ value, label, marker, markerClass }, index) => (
                  <Fragment key={value}>
                    {index > 0 && <ToggleGroupSeparator />}
                    <ToggleGroupItem
                      value={value}
                      className="min-h-11 bg-card text-xs data-pressed:border-primary data-pressed:bg-secondary data-pressed:text-secondary-foreground sm:text-sm"
                    >
                      <span
                        aria-hidden="true"
                        className="hidden sm:inline-flex"
                      >
                        <span className={`map-key ${markerClass}`}>
                          {marker}
                        </span>
                      </span>
                      {label}
                    </ToggleGroupItem>
                  </Fragment>
                ))}
              </ToggleGroup>
            }
            renderActions={(job) => (
              <ListingActions
                job={job}
                session={session}
                onChanged={() => void feed.reload()}
              />
            )}
          />
          {placing && post && (
            <div className="absolute start-1/2 top-20 z-10 w-[min(27rem,calc(100%-2rem))] -translate-x-1/2 space-y-3 rounded-xl border bg-card p-4 shadow-lg">
              <div className="flex items-start justify-between gap-3">
                <p role="status" className="text-sm font-medium">
                  Choose where in Calgary on the map.
                </p>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  onClick={() => setPlacing(false)}
                  aria-label="Cancel choosing a location"
                >
                  <XIcon aria-hidden="true" />
                </Button>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => pickLocation(CALGARY_CENTER)}
              >
                Use downtown Calgary
              </Button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

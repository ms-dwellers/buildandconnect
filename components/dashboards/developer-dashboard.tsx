"use client";

import { ArrowRightIcon, MapPinIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardPanel } from "@/components/ui/card";
import { ErrorAlert, LoadingBlock } from "@/components/app/require-role";
import { useApi, usePaged } from "@/lib/use-api";
import type {
  Interest,
  NearbyRequest,
  OpportunityRecord,
  OwnProfile,
  RequestRecord,
} from "@/lib/types";
import { InterestSection } from "./requester-opportunities";
import { DeveloperSidebar } from "./developer-sidebar";
import {
  ConfirmButton,
  ItemCard,
  ListState,
  Section,
  useMutation,
} from "./parts";

type Nearby = { data: NearbyRequest[]; total: number };

export function DeveloperDashboard({
  profile,
}: {
  profile: ReturnType<typeof useApi<OwnProfile>>;
}) {
  if (profile.error?.status === 404)
    return (
      <Card>
        <CardPanel className="space-y-3 p-6">
          <h2 className="text-2xl">A little about you first</h2>
          <p className="max-w-lg text-sm leading-6 text-muted-foreground">
            Add your skills and interests to get project recommendations. Your
            profile stays private unless you choose otherwise.
          </p>
        </CardPanel>
      </Card>
    );
  if (profile.error)
    return (
      <ErrorAlert
        title="Your profile could not be loaded"
        message={profile.error.message}
        onRetry={() => void profile.reload()}
      />
    );
  if (!profile.data) return <LoadingBlock />;
  return <Dashboard profile={profile.data} />;
}

function Dashboard({ profile }: { profile: OwnProfile }) {
  const nearby = useApi<Nearby>(
    profile.location ? "/requests/nearby?limit=20" : null,
  );
  const claimed = usePaged<RequestRecord>("/requests/claimed");
  const opportunities = usePaged<OpportunityRecord>("/opportunities", 6);
  const interests = usePaged<Interest>("/interests");
  const { pending, run } = useMutation();
  const release = async (id: string) => {
    if (
      await run(
        id,
        `/requests/${id}/release`,
        { method: "POST" },
        "Request released",
      )
    )
      await Promise.all([nearby.reload(), claimed.reload()]);
  };

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_17rem]">
      <div className="min-w-0 space-y-9">
        <InterestSection interests={interests} viewer="developer" />
        <AcceptedRequests
          claimed={claimed}
          pending={pending}
          release={release}
        />
        <Section title="Explore projects">
          <ListState
            {...opportunities}
            layout="grid"
            onRetry={() => void opportunities.reload()}
            onLoadMore={() => void opportunities.loadMore()}
            empty={
              <Card>
                <CardPanel className="space-y-3 p-6">
                  <h3 className="text-lg font-semibold">
                    No open projects right now
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    You can still set a career target or look for local
                    community requests.
                  </p>
                  <Button
                    render={<a href="/map" />}
                    variant="outline"
                    size="sm"
                  >
                    Explore the map
                  </Button>
                </CardPanel>
              </Card>
            }
          >
            {(opportunity) => (
              <li key={opportunity.id}>
                <ItemCard>
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-muted-foreground">
                      <span>
                        {opportunity.kind === "paid"
                          ? "Paid project"
                          : "Volunteer project"}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPinIcon aria-hidden="true" className="size-3.5" />
                        {opportunity.remote
                          ? "Remote"
                          : (opportunity.place ?? opportunity.city)}
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold leading-tight">
                      {opportunity.title}
                    </h3>
                    <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                      {opportunity.description}
                    </p>
                    <p className="text-sm font-medium">
                      {opportunity.commitment ??
                        `${opportunity.minimumWeeklyHours}+ hours per week`}
                    </p>
                    <Button
                      render={<a href={`/opportunities/${opportunity.id}`} />}
                      variant="outline"
                      size="sm"
                    >
                      View project <ArrowRightIcon aria-hidden="true" />
                    </Button>
                  </div>
                </ItemCard>
              </li>
            )}
          </ListState>
        </Section>
        {profile.location && <NearbyRequests nearby={nearby} />}
      </div>
      <DeveloperSidebar profile={profile} />
    </div>
  );
}

function NearbyRequests({
  nearby,
}: {
  nearby: ReturnType<typeof useApi<Nearby>>;
}) {
  if (!nearby.loading && !nearby.error && !nearby.data?.data.length)
    return null;
  return (
    <details className="dashboard-disclosure">
      <summary>Nearby community requests</summary>
      <div className="mt-5 space-y-4">
        <p className="text-sm text-muted-foreground">
          Short local requests you can accept directly, without a
          mutual-interest step.
        </p>
        <ListState
          items={nearby.data?.data ?? []}
          loading={nearby.loading}
          error={nearby.error}
          onRetry={() => void nearby.reload()}
          empty={null}
        >
          {(request) => (
            <li key={request.requestId}>
              <ItemCard>
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {request.distanceKm} km away · {request.place}
                  </p>
                  <h3 className="text-lg font-semibold">{request.title}</h3>
                  <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                    {request.description}
                  </p>
                  {request.skillsToDevelop.length > 0 && (
                    <p className="text-sm">
                      Practice: {request.skillsToDevelop.join(", ")}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {request.explanation}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    render={<a href={`/requests/${request.requestId}`} />}
                  >
                    Review request <ArrowRightIcon aria-hidden="true" />
                  </Button>
                </div>
              </ItemCard>
            </li>
          )}
        </ListState>
      </div>
    </details>
  );
}

function AcceptedRequests({
  claimed,
  pending,
  release,
}: {
  claimed: ReturnType<typeof usePaged<RequestRecord>>;
  pending: string | null;
  release: (id: string) => Promise<void>;
}) {
  if (!claimed.loading && !claimed.error && !claimed.items.length) return null;
  return (
    <Section title="Accepted requests">
      <ListState
        {...claimed}
        onRetry={() => void claimed.reload()}
        onLoadMore={() => void claimed.loadMore()}
        empty={null}
      >
        {(request) => (
          <li key={request.id}>
            <ItemCard>
              <div className="min-w-0 flex-1 basis-48 space-y-2">
                <Badge variant="info">Accepted</Badge>
                <h3 className="text-xl font-semibold">{request.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {request.ownerName} · {request.place}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  render={<a href={`/requests/${request.id}`} />}
                  variant="outline"
                  size="sm"
                >
                  View request
                </Button>
                <ConfirmButton
                  label="Release"
                  title="Release this request?"
                  description="It reopens for other developers nearby."
                  confirmLabel="Release request"
                  variant="ghost"
                  size="sm"
                  loading={pending === request.id}
                  onConfirm={() => void release(request.id)}
                />
              </div>
            </ItemCard>
          </li>
        )}
      </ListState>
    </Section>
  );
}

"use client";

import Link from "next/link";
import {
  BriefcaseBusinessIcon,
  CircleCheckIcon,
  CompassIcon,
  MapPinIcon,
  UserRoundPenIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardPanel } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ErrorAlert, LoadingBlock } from "@/components/app/require-role";
import { useApi, usePaged } from "@/lib/use-api";
import type {
  Interest,
  NearbyRequest,
  OpportunityRecord,
  OwnProfile,
  RequestRecord,
} from "@/lib/types";
import { InterestSection } from "./company-dashboard";
import {
  ConfirmButton,
  EmptyState,
  ItemCard,
  ListState,
  Section,
  plural,
  useMutation,
} from "./parts";

type Nearby = { data: NearbyRequest[]; total: number };

export function DeveloperDashboard() {
  const profile = useApi<OwnProfile>("/developers/me");
  if (profile.error?.status === 404)
    return (
      <EmptyState
        icon={UserRoundPenIcon}
        title="Create your developer profile"
        description="Add your skills, projects and what you want to learn. Matching and nearby requests start from your profile."
        action={
          <Button render={<Link href="/profile" />}>Create your profile</Button>
        }
      />
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
  return <Dashboard profile={profile.data} reload={profile.reload} />;
}

function Dashboard({
  profile,
  reload,
}: {
  profile: OwnProfile;
  reload: () => Promise<void>;
}) {
  const nearby = useApi<Nearby>(
    profile.location ? "/requests/nearby?limit=20" : null,
  );
  const claimed = usePaged<RequestRecord>("/requests/claimed");
  const opportunities = usePaged<OpportunityRecord>("/opportunities", 6);
  const interests = usePaged<Interest>("/interests");
  const { pending, run } = useMutation();

  const toggle = async (key: "available" | "discoverable", value: boolean) => {
    if (
      await run(
        key,
        "/developers/me",
        { method: "PATCH", body: JSON.stringify({ [key]: value }) },
        "Profile visibility updated",
      )
    )
      await reload();
  };
  const accept = async (id: string) => {
    if (
      await run(
        id,
        `/requests/${id}/accept`,
        { method: "POST" },
        "Request accepted. The requester can see your name.",
      )
    )
      await Promise.all([nearby.reload(), claimed.reload()]);
  };
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
    <div className="space-y-12">
      <Card>
        <CardPanel className="grid gap-6 p-6 md:grid-cols-[1fr_auto]">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">{profile.name}</h2>
              <span className="text-sm text-muted-foreground">
                {profile.city}
              </span>
            </div>
            <p className="line-clamp-2 max-w-xl text-sm text-muted-foreground">
              {profile.bio}
            </p>
            <p className="flex items-center gap-1.5 text-sm">
              <MapPinIcon aria-hidden="true" className="size-4 text-primary" />
              {profile.location
                ? `Finding requests within ${profile.location.radiusKm} km of your pin`
                : "No area set yet. Set one to see nearby requests."}
            </p>
            <Button
              render={<Link href="/profile" />}
              variant="outline"
              size="sm"
            >
              Edit profile and area
            </Button>
          </div>
          <div className="space-y-4 md:min-w-64">
            {(
              [
                ["available", "Available for new work"],
                ["discoverable", "Visible to companies and recruiters"],
              ] as const
            ).map(([key, label]) => (
              <div
                key={key}
                className="flex items-center justify-between gap-4"
              >
                <Label htmlFor={`toggle-${key}`}>{label}</Label>
                <Switch
                  id={`toggle-${key}`}
                  checked={profile[key]}
                  disabled={pending === key}
                  onCheckedChange={(value) => void toggle(key, value)}
                />
              </div>
            ))}
          </div>
        </CardPanel>
      </Card>

      <Section
        title="Accepted requests"
        description="Community requests you've taken on."
      >
        <ListState
          {...claimed}
          onRetry={() => void claimed.reload()}
          onLoadMore={() => void claimed.loadMore()}
          empty={
            <p className="text-sm text-muted-foreground">
              Nothing accepted yet. Pick a nearby request below.
            </p>
          }
        >
          {(request) => (
            <li key={request.id}>
              <ItemCard>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <h3 className="font-semibold">{request.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {request.ownerName} · {request.place}
                  </p>
                  <p className="line-clamp-2 text-sm">{request.description}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    render={<Link href={`/map?focus=${request.id}`} />}
                    variant="ghost"
                    size="sm"
                  >
                    View on map
                  </Button>
                  <ConfirmButton
                    label="Release"
                    title="Release this request?"
                    description="It reopens for other developers nearby."
                    confirmLabel="Release request"
                    variant="outline"
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

      <Section
        title="Nearby requests"
        description={
          nearby.data
            ? `${plural(nearby.data.total, "open request")} in your area, ranked by growth fit.`
            : undefined
        }
        action={
          <Button render={<Link href="/map" />} variant="ghost" size="sm">
            <CompassIcon aria-hidden="true" />
            Open the map
          </Button>
        }
      >
        {!profile.location ? (
          <EmptyState
            icon={MapPinIcon}
            title="Set your area"
            description="Drop a pin and choose a radius to see community requests near you."
            action={
              <Button render={<Link href="/profile#area" />}>
                Set your area
              </Button>
            }
          />
        ) : (
          <ListState
            items={nearby.data?.data ?? []}
            loading={nearby.loading}
            error={nearby.error}
            onRetry={() => void nearby.reload()}
            empty={
              <p className="text-sm text-muted-foreground">
                No open requests in your area right now. Try a larger radius.
              </p>
            }
          >
            {(request) => (
              <li key={request.requestId}>
                <ItemCard>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">
                        {Math.round(request.score)}% fit
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {request.distanceKm} km away · {request.place}
                      </span>
                    </div>
                    <h3 className="font-semibold">{request.title}</h3>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {request.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {request.explanation}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    loading={pending === request.requestId}
                    onClick={() => void accept(request.requestId)}
                  >
                    <CircleCheckIcon aria-hidden="true" />
                    Accept
                  </Button>
                </ItemCard>
              </li>
            )}
          </ListState>
        )}
      </Section>

      <Section
        title="Open opportunities"
        description="Paid and volunteer projects posted by companies."
      >
        <ListState
          {...opportunities}
          onRetry={() => void opportunities.reload()}
          onLoadMore={() => void opportunities.loadMore()}
          empty={
            <EmptyState
              icon={BriefcaseBusinessIcon}
              title="No open opportunities"
              description="Check back soon, or explore community requests on the map."
            />
          }
        >
          {(opportunity) => (
            <li key={opportunity.id}>
              <ItemCard>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      {opportunity.kind === "paid" ? "Paid" : "Volunteer"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {opportunity.remote
                        ? "Remote"
                        : (opportunity.place ?? opportunity.city)}
                    </span>
                  </div>
                  <h3 className="font-semibold">{opportunity.title}</h3>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {opportunity.description}
                  </p>
                </div>
                <Button
                  render={<Link href={`/opportunities/${opportunity.id}`} />}
                  variant="outline"
                  size="sm"
                >
                  See your fit
                </Button>
              </ItemCard>
            </li>
          )}
        </ListState>
      </Section>

      <InterestSection interests={interests} viewer="developer" />
    </div>
  );
}

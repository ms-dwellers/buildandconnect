"use client";

import { ArrowRightIcon, CompassIcon, MapPinIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardPanel } from "@/components/ui/card";
import { ErrorAlert, LoadingBlock } from "@/components/app/require-role";
import { useApi } from "@/lib/use-api";
import type { SavedCareerTarget } from "@/lib/career";
import type { OwnProfile } from "@/lib/types";

export function DeveloperSidebar({ profile }: { profile: OwnProfile }) {
  const target = useApi<SavedCareerTarget | null>(
    "/developers/me/career-target",
  );
  return (
    <aside aria-label="Your goal and profile" className="min-w-0 space-y-5">
      <Card className="shadow-none">
        <CardPanel className="space-y-4 p-6">
          <h2 className="text-xl">Your next role</h2>
          {target.error ? (
            <ErrorAlert
              title="Target could not be loaded"
              message={target.error.message}
              onRetry={() => void target.reload()}
            />
          ) : target.data === undefined ? (
            <LoadingBlock rows={1} />
          ) : target.data ? (
            <>
              <p className="text-lg font-medium leading-snug">
                {target.data.title}
              </p>
              <Button render={<a href="/career" />} variant="ghost" size="sm">
                View career target <ArrowRightIcon aria-hidden="true" />
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm leading-6 text-muted-foreground">
                Bring a job description. Find real projects connected to the
                experience it asks for.
              </p>
              <Button render={<a href="/career" />} variant="ghost" size="sm">
                Choose a target job <ArrowRightIcon aria-hidden="true" />
              </Button>
            </>
          )}
        </CardPanel>
      </Card>
      <Card className="shadow-none">
        <CardPanel className="space-y-4 p-6">
          <h2 className="text-xl">Your profile</h2>
          <div className="space-y-2">
            <p className="font-medium">{profile.name}</p>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPinIcon aria-hidden="true" className="size-4 shrink-0" />
              {profile.city}
            </p>
            <p className="text-sm leading-6 text-muted-foreground">
              {profile.discoverable
                ? "Visible to requesters"
                : "Private profile"}{" "}
              ·{" "}
              {profile.available
                ? "Available for projects"
                : "Not available for new work"}
            </p>
          </div>
          <Button render={<a href="/profile" />} variant="outline" size="sm">
            Edit profile and availability
          </Button>
        </CardPanel>
      </Card>
      <div className="space-y-3 px-1 py-2">
        <h2 className="flex items-center gap-2 text-lg">
          <CompassIcon aria-hidden="true" className="size-5" />
          Explore locally
        </h2>
        <p className="text-sm leading-6 text-muted-foreground">
          {profile.location
            ? `Community requests within ${profile.location.radiusKm} km of your pin.`
            : "Find community requests near you on the map."}
        </p>
        <Button render={<a href="/map" />} variant="ghost" size="sm">
          Open the map <ArrowRightIcon aria-hidden="true" />
        </Button>
      </div>
    </aside>
  );
}

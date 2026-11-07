"use client";

import { CircleCheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMutation } from "@/components/dashboards/parts";
import type { CityJob } from "@/lib/calgary";
import type { Session } from "@/lib/session";

/** What the signed-in viewer can do with a map listing, by role and ownership. */
export function ListingActions({
  job,
  session,
  onChanged,
}: {
  job: CityJob;
  session: Session;
  onChanged: () => void;
}) {
  const { pending, run } = useMutation();
  if (session.status === "loading") return null;
  if (session.status !== "member")
    return (
      <Button
        render={
          <a
            href={`/sign-in?next=${encodeURIComponent(`/map?focus=${job.id}`)}`}
          />
        }
        size="sm"
        className="w-full"
      >
        Sign in to respond
      </Button>
    );

  if (job.source === "opportunity")
    return (
      <Button
        render={<a href={`/opportunities/${job.id}`} />}
        size="sm"
        variant={job.viewerIsOwner ? "outline" : "default"}
        className="w-full"
      >
        {job.viewerIsOwner
          ? "View candidates"
          : session.role === "developer"
            ? "See your fit"
            : "View details"}
      </Button>
    );

  if (job.viewerIsOwner)
    return (
      <div className="flex gap-2">
        {job.status === "open" && (
          <Button
            render={<a href={`/requests/${job.id}/edit`} />}
            size="sm"
            variant="outline"
            className="flex-1"
          >
            Edit
          </Button>
        )}
        <Button
          render={<a href="/dashboard" />}
          size="sm"
          variant="outline"
          className="flex-1"
        >
          Manage requests
        </Button>
      </div>
    );

  if (session.role !== "developer") return null;
  const claim = async (action: "accept" | "release") => {
    if (
      await run(
        job.id,
        `/requests/${job.id}/${action}`,
        { method: "POST" },
        action === "accept"
          ? "Request accepted. It's on your dashboard."
          : "Request released",
      )
    )
      onChanged();
  };
  return job.viewerHasClaimed ? (
    <Button
      size="sm"
      variant="outline"
      className="w-full"
      loading={pending === job.id}
      onClick={() => void claim("release")}
    >
      Release request
    </Button>
  ) : (
    <Button
      size="sm"
      className="w-full"
      loading={pending === job.id}
      onClick={() => void claim("accept")}
    >
      <CircleCheckIcon aria-hidden="true" />
      Accept request
    </Button>
  );
}

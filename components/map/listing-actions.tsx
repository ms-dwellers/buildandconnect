"use client";

import { Button } from "@/components/ui/button";
import type { CityJob } from "@/lib/calgary";
import type { Session } from "@/lib/session";
import { withNext } from "@/lib/navigation";

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
  if (session.status === "loading") return null;
  if (session.status !== "member")
    return (
      <Button
        render={
          <a
            href={withNext(
              "/sign-in",
              job.source === "request"
                ? `/requests/${encodeURIComponent(job.id)}`
                : `/opportunities/${encodeURIComponent(job.id)}`,
            )}
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
        render={<a href={`/opportunities/${encodeURIComponent(job.id)}`} />}
        size="sm"
        variant={job.viewerIsOwner ? "outline" : "default"}
        className="w-full"
      >
        View full project
      </Button>
    );

  if (job.viewerIsOwner)
    return (
      <div className="flex flex-wrap gap-2">
        <Button
          render={<a href={`/requests/${encodeURIComponent(job.id)}`} />}
          size="sm"
          className="w-full"
        >
          View full request
        </Button>
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

  if (session.role !== "developer")
    return (
      <p className="text-xs leading-5 text-muted-foreground">
        Only developers and the requester can open the full request details.
      </p>
    );
  return (
    <Button
      size="sm"
      className="w-full"
      render={<a href={`/requests/${encodeURIComponent(job.id)}`} />}
    >
      {job.viewerHasClaimed ? "View accepted request" : "View full request"}
    </Button>
  );
}

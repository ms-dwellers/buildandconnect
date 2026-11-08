"use client";

import { ClockIcon, MapPinIcon, StarIcon, FolderCodeIcon } from "lucide-react";
import { Card, CardPanel } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ErrorAlert,
  LoadingBlock,
  RequireRole,
} from "@/components/app/require-role";
import { useApi } from "@/lib/use-api";
import type { PublicDeveloper, DeveloperReputation } from "@/lib/types";

const levels = ["", "Beginner", "Comfortable", "Capable", "Strong", "Expert"];

export function DeveloperProfilePage({ id }: { id: string }) {
  return (
    <RequireRole roles={["requester"]}>
      {() => <LoadedProfile id={id} />}
    </RequireRole>
  );
}

function LoadedProfile({ id }: { id: string }) {
  const profile = useApi<PublicDeveloper>(
    `/developers/${encodeURIComponent(id)}`,
  );
  if (profile.error)
    return (
      <ErrorAlert
        title="Profile unavailable"
        message={profile.error.message}
        onRetry={() => void profile.reload()}
      />
    );
  if (!profile.data) return <LoadingBlock />;
  return <DeveloperProfileView profile={profile.data} />;
}

export function DeveloperProfileView({
  profile,
}: {
  profile: PublicDeveloper;
}) {
  const reputation = useApi<DeveloperReputation>(
    `/developers/${encodeURIComponent(profile.id)}/reputation`,
  );
  return (
    <div className="space-y-6 [overflow-wrap:anywhere]">
      <Card className="overflow-hidden">
        <div className="h-20 border-b bg-secondary sm:h-28" />
        <CardPanel className="relative space-y-5 p-6 sm:p-8">
          <div className="-mt-14 flex flex-wrap items-end justify-between gap-4">
            <div
              aria-hidden="true"
              className="flex size-20 items-center justify-center rounded-2xl border-4 border-card bg-primary font-display text-3xl text-primary-foreground"
            >
              {profile.name
                .trim()
                .split(/\s+/)
                .slice(0, 2)
                .map((part) => part[0])
                .join("")}
            </div>
            <Badge variant={profile.available ? "success" : "outline"}>
              {profile.available ? "Open to projects" : "Not taking new work"}
            </Badge>
          </div>
          <div className="space-y-3">
            <h2 className="font-display text-3xl tracking-tight">
              {profile.name}
            </h2>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <MapPinIcon aria-hidden="true" className="size-4" />
                {profile.city}
              </span>
              <span className="flex items-center gap-1.5">
                <ClockIcon aria-hidden="true" className="size-4" />
                {profile.weeklyHours} hours / week
              </span>
              <span>
                {profile.collaboration === "async"
                  ? "Mostly async"
                  : profile.collaboration === "sync"
                    ? "Live collaboration"
                    : "Flexible collaboration"}
              </span>
            </div>
            <p className="max-w-3xl whitespace-pre-line text-sm leading-7">
              {profile.bio}
            </p>
            {reputation.data && (
              <a
                href="#requester-feedback"
                className="inline-flex items-center gap-2 text-sm underline underline-offset-4"
              >
                <StarIcon aria-hidden="true" className="size-4" />
                {reputation.data.average === null
                  ? "No requester reviews yet"
                  : `${reputation.data.average.toFixed(1)} / 5 from ${reputation.data.count} ${reputation.data.count === 1 ? "review" : "reviews"}`}
              </a>
            )}
          </div>
        </CardPanel>
      </Card>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <Card>
            <CardPanel className="space-y-5 p-6">
              <div>
                <h3 className="text-xl font-semibold">Selected work</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Projects described by the developer. Ask about their
                  contribution and a demo before starting.
                </p>
              </div>
              {profile.projects.length ? (
                profile.projects.map((project, index) => (
                  <article key={index} className="space-y-2 border-t pt-5">
                    <h4 className="flex items-center gap-2 font-semibold">
                      <FolderCodeIcon
                        aria-hidden="true"
                        className="size-4 shrink-0"
                      />
                      {project.title}
                    </h4>
                    <p className="whitespace-pre-line text-sm leading-6">
                      {project.description}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {project.technologies.join(" · ")}
                    </p>
                  </article>
                ))
              ) : (
                <p className="rounded-xl bg-muted p-4 text-sm leading-6 text-muted-foreground">
                  No projects shared yet. Personal, school and volunteer work
                  are all useful evidence of what someone can build.
                </p>
              )}
            </CardPanel>
          </Card>
          <DeveloperReviews reputation={reputation} />
        </div>
        <div className="space-y-6">
          <Card>
            <CardPanel className="space-y-4 p-6">
              <h3 className="text-xl font-semibold">Skills & experience</h3>
              <p className="text-xs text-muted-foreground">
                Self-reported levels, not verified ratings.
              </p>
              <dl className="space-y-3">
                {profile.skills.map((skill) => (
                  <div
                    key={skill.name}
                    className="flex items-baseline justify-between gap-3 border-b pb-3 last:border-0 last:pb-0"
                  >
                    <dt className="text-sm font-medium">{skill.name}</dt>
                    <dd className="text-xs text-muted-foreground">
                      {levels[skill.level] ?? "Not specified"}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardPanel>
          </Card>
          {(profile.wantsToLearn.length > 0 ||
            profile.interests.length > 0) && (
            <Card>
              <CardPanel className="space-y-5 p-6">
                {profile.wantsToLearn.length > 0 && (
                  <div>
                    <h3 className="font-semibold">Learning next</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {profile.wantsToLearn.join(" · ")}
                    </p>
                  </div>
                )}
                {profile.interests.length > 0 && (
                  <div>
                    <h3 className="font-semibold">Causes that matter</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {profile.interests.join(" · ")}
                    </p>
                  </div>
                )}
              </CardPanel>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function DeveloperReviews({
  reputation,
}: {
  reputation: ReturnType<typeof useApi<DeveloperReputation>>;
}) {
  return (
    <Card id="requester-feedback" className="scroll-mt-6">
      <CardPanel className="space-y-5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h3 className="text-xl font-semibold">Requester feedback</h3>
          {reputation.data?.average != null && (
            <span className="flex items-center gap-1.5 font-semibold">
              <StarIcon aria-hidden="true" className="size-4 text-primary" />
              {reputation.data.average.toFixed(1)} / 5{" "}
              <span className="text-sm font-normal text-muted-foreground">
                ({reputation.data.count})
              </span>
            </span>
          )}
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          Only requesters with a mutual project connection can review. They
          confirm they worked together; Build &amp; Connect does not
          independently verify delivery.
        </p>
        {reputation.error ? (
          <ErrorAlert
            title="Feedback could not be loaded"
            message={reputation.error.message}
            onRetry={() => void reputation.reload()}
          />
        ) : !reputation.data ? (
          <LoadingBlock rows={1} />
        ) : reputation.data.count === 0 ? (
          <div className="rounded-xl bg-muted p-4">
            <p className="font-medium">No reviews yet</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              New here doesn’t mean new to building. Look at the projects and
              discuss a small first milestone.
            </p>
          </div>
        ) : (
          <ul className="space-y-5">
            {reputation.data.reviews.map((review) => (
              <li
                key={review.opportunityId}
                className="space-y-2 border-t pt-5"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="font-medium">{review.requesterName}</span>
                  <span className="text-sm">{review.rating} / 5</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {review.projectTitle} ·{" "}
                  {new Date(review.createdAt).toLocaleDateString("en", {
                    month: "short",
                    year: "numeric",
                    timeZone: "UTC",
                  })}
                </p>
                <p className="whitespace-pre-line text-sm leading-6">
                  {review.comment}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardPanel>
    </Card>
  );
}

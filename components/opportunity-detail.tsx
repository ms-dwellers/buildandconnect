"use client";

import { FieldMessage } from "@/components/forms/form-kit";
import { formatWeeklyHours } from "@/lib/format";
import { useMemo } from "react";
import {
  HandshakeIcon,
  MapPinIcon,
  PencilIcon,
  UsersRoundIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardPanel } from "@/components/ui/card";
import {
  ErrorAlert,
  LoadingBlock,
  RequireRole,
} from "@/components/app/require-role";
import {
  EmptyState,
  ItemCard,
  ListState,
  OpportunityStatusBadge,
  Section,
  useMutation,
} from "@/components/dashboards/parts";
import { useApi, usePaged } from "@/lib/use-api";
import { ProjectScope } from "@/components/project-scope";
import { ConfirmButton } from "@/components/dashboards/parts";
import { withNext } from "@/lib/navigation";
import type {
  DeveloperMatch,
  Interest,
  MatchScores,
  OpportunityRecord,
} from "@/lib/types";

const FACTORS: [keyof MatchScores, string][] = [
  ["technicalReadiness", "Readiness"],
  ["growthPotential", "Growth"],
  ["developerInterest", "Shared interests"],
  ["collaborationCompatibility", "Collaboration"],
  ["opportunityExposure", "Exposure"],
];

export function OpportunityDetail({ id }: { id: string }) {
  return (
    <RequireRole>
      {({ user, role }) => (
        <Loaded key={`${user.id}:${id}`} id={id} userId={user.id} role={role} />
      )}
    </RequireRole>
  );
}

function Loaded({
  id,
  userId,
  role,
}: {
  id: string;
  userId: string;
  role: string;
}) {
  const opportunity = useApi<OpportunityRecord>(
    `/opportunities/${encodeURIComponent(id)}`,
  );
  if (opportunity.error)
    return (
      <ErrorAlert
        title="This project could not be loaded"
        message={opportunity.error.message}
        onRetry={() => void opportunity.reload()}
      />
    );
  if (!opportunity.data) return <LoadingBlock />;
  const job = opportunity.data;
  const owner = job.ownerId === userId;
  return (
    <div className="space-y-8">
      <ProjectHeading opportunity={job} owner={owner} />
      <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <aside
          aria-label="Project commitment and response"
          className="space-y-6 lg:order-2"
        >
          <Card className="border-t-4 border-t-primary">
            <CardPanel className="space-y-4 p-6">
              <h2 className="text-xl font-semibold">The commitment</h2>
              <dl className="space-y-4 text-sm">
                <div>
                  <dt className="font-mono text-xs text-muted-foreground">
                    Time
                  </dt>
                  <dd className="mt-1 font-medium">
                    {job.commitment ??
                      `${job.minimumWeeklyHours}+ hours per week`}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-xs text-muted-foreground">
                    Compensation
                  </dt>
                  <dd className="mt-1 font-medium">
                    {job.compensation ??
                      (job.kind === "paid" ? "Paid" : "Volunteer")}
                  </dd>
                </div>
              </dl>
              <a
                href="#project-scope"
                className="inline-block text-sm underline underline-offset-4"
              >
                Read the full project scope
              </a>
            </CardPanel>
          </Card>
          {role === "developer" && (
            <YourFit opportunity={job} reloadOpportunity={opportunity.reload} />
          )}
        </aside>
        <div className="min-w-0 lg:order-1" id="project-scope" tabIndex={-1}>
          <Summary opportunity={job} />
        </div>
      </div>
      {owner && <Candidates opportunity={job} />}
    </div>
  );
}

function ProjectHeading({
  opportunity,
  owner,
}: {
  opportunity: OpportunityRecord;
  owner: boolean;
}) {
  const { analysis } = opportunity;
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-6">
      <div className="space-y-3">
        <h1 className="max-w-3xl text-balance font-display text-4xl leading-tight tracking-tight sm:text-5xl">
          {opportunity.title}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <OpportunityStatusBadge status={opportunity.status} />
          <Badge variant="outline">
            {opportunity.kind === "paid" ? "Paid" : "Volunteer"}
          </Badge>
          {analysis.mentorshipAvailable && (
            <span className="text-xs text-primary">Mentorship offered</span>
          )}
        </div>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPinIcon aria-hidden="true" className="size-4" />
          {opportunity.remote
            ? `Remote or ${opportunity.city}`
            : (opportunity.place ?? opportunity.city)}
        </p>
      </div>
      {owner && (
        <Button
          render={<a href={`/opportunities/${opportunity.id}/edit`} />}
          variant="outline"
          size="sm"
        >
          <PencilIcon aria-hidden="true" />
          Edit
        </Button>
      )}
    </div>
  );
}

function Summary({ opportunity }: { opportunity: OpportunityRecord }) {
  const { analysis } = opportunity;
  return (
    <Card>
      <CardPanel className="space-y-5 p-6 sm:p-8">
        <h2 className="text-xl font-semibold">Project brief</h2>
        <p className="whitespace-pre-line text-sm leading-7">
          {opportunity.description}
        </p>
        <dl className="grid gap-4 border-t pt-5 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Technologies</dt>
            <dd className="mt-1.5 flex flex-wrap gap-1.5">
              {[
                ...analysis.requiredTechnologies,
                ...analysis.preferredTechnologies,
              ].map((tech, index) => (
                <Badge
                  key={tech}
                  variant={
                    index < analysis.requiredTechnologies.length
                      ? "secondary"
                      : "outline"
                  }
                >
                  {tech}
                </Badge>
              ))}
            </dd>
          </div>
          {analysis.learningOpportunities.length > 0 && (
            <div>
              <dt className="text-xs text-muted-foreground">You could learn</dt>
              <dd className="mt-1">
                {analysis.learningOpportunities.join(", ")}
              </dd>
            </div>
          )}
        </dl>
        <p className="text-sm">
          At least {formatWeeklyHours(opportunity.minimumWeeklyHours)} ·{" "}
          {opportunity.collaboration === "async"
            ? "Mostly asynchronous"
            : opportunity.collaboration === "sync"
              ? "Live sessions"
              : "Flexible collaboration"}
        </p>
        {opportunity.essentialTechnologies.length > 0 && (
          <p className="text-sm">
            Required by the requester:{" "}
            {opportunity.essentialTechnologies.join(", ")}
          </p>
        )}
        <ProjectScope analysis={analysis} />
      </CardPanel>
    </Card>
  );
}

function useInterestFor(opportunityId: string) {
  const interests = usePaged<Interest>(
    `/opportunities/${encodeURIComponent(opportunityId)}/interests`,
    100,
  );
  const byDeveloper = useMemo(
    () =>
      new Map(
        interests.items
          .filter((item) => item.opportunityId === opportunityId)
          .map((item) => [item.developerId, item]),
      ),
    [interests.items, opportunityId],
  );
  return { byDeveloper, reload: interests.reload, error: interests.error };
}

function Scores({
  scores,
  compact = false,
}: {
  scores: MatchScores;
  compact?: boolean;
}) {
  return (
    <dl
      className={`grid grid-cols-2 gap-x-6 gap-y-2 text-xs ${compact ? "" : "sm:grid-cols-5"}`}
    >
      {FACTORS.map(([key, label]) => (
        <div
          key={key}
          className={
            compact ? "space-y-1" : "flex justify-between gap-2 sm:block"
          }
        >
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="font-medium tabular-nums">
            {Math.round(scores[key])}%
          </dd>
        </div>
      ))}
    </dl>
  );
}

function InterestBadge({ interest }: { interest?: Interest }) {
  if (interest?.connected) return <Badge variant="success">Connected</Badge>;
  return null;
}

function Candidates({ opportunity }: { opportunity: OpportunityRecord }) {
  const matches = useApi<{ data: DeveloperMatch[]; total: number }>(
    `/opportunities/${opportunity.id}/matches?limit=50`,
  );
  const interest = useInterestFor(opportunity.id);
  const { pending, run } = useMutation();
  const toggle = async (developerId: string, interested: boolean) => {
    if (
      await run(
        developerId,
        `/opportunities/${opportunity.id}/interest`,
        { method: "PUT", body: JSON.stringify({ developerId, interested }) },
        interested ? "Interest sent" : "Interest withdrawn",
      )
    )
      await interest.reload();
  };
  return (
    <Section
      title="Ranked candidates"
      description={
        matches.data
          ? `${matches.data.total} eligible ${matches.data.total === 1 ? "developer" : "developers"}, ranked by readiness and growth. Scores support your judgement; they don't predict success.`
          : undefined
      }
    >
      {interest.error && (
        <ErrorAlert
          title="Responses could not be loaded"
          message={interest.error.message}
          onRetry={() => void interest.reload()}
        />
      )}
      {opportunity.status === "closed" ? (
        <p className="text-sm text-muted-foreground">
          This opportunity is closed. Reopen it from your dashboard to see
          candidates.
        </p>
      ) : (
        <ListState
          items={matches.data?.data ?? []}
          loading={matches.loading}
          error={matches.error}
          onRetry={() => void matches.reload()}
          empty={
            <EmptyState
              icon={UsersRoundIcon}
              title="No eligible developers yet"
              description="Developers appear here when they're available, discoverable, and meet your essential requirements."
            />
          }
        >
          {(match) => {
            const current = interest.byDeveloper.get(match.developerId);
            const interested = current?.requesterInterested ?? false;
            return (
              <li key={match.developerId}>
                <ItemCard>
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{match.name}</h3>
                      <Badge variant="secondary">
                        {Math.round(match.score)}% match
                      </Badge>
                      <InterestBadge interest={current} />
                      {!current?.connected && current?.developerInterested && (
                        <Badge variant="info">Interested in this role</Badge>
                      )}
                    </div>
                    {current?.connected && (
                      <p className="text-sm">
                        You are both interested. Agree on scope, timing, and
                        support before starting; no work assignment or messaging
                        is created automatically.
                      </p>
                    )}
                    {interested && !current?.connected && (
                      <p className="text-sm">
                        Your interest is shared. Waiting for the developer’s
                        response.
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {match.explanation}
                    </p>
                    <Scores scores={match.scores} />
                  </div>
                  <ConfirmButton
                    confirmVariant={interested ? "destructive" : "default"}
                    variant={interested ? "outline" : "default"}
                    size="sm"
                    loading={pending === match.developerId}
                    disabled={!!interest.error}
                    label={
                      interested ? "Withdraw interest" : "Express interest"
                    }
                    title={
                      interested
                        ? "Withdraw your interest?"
                        : `Express interest in ${match.name}?`
                    }
                    description={
                      interested
                        ? "Any mutual connection with this developer will end."
                        : "The developer can see your interest. This does not assign work or send an invitation outside the app."
                    }
                    confirmLabel={
                      interested ? "Withdraw interest" : "Express interest"
                    }
                    onConfirm={() =>
                      void toggle(match.developerId, !interested)
                    }
                  />
                </ItemCard>
              </li>
            );
          }}
        </ListState>
      )}
    </Section>
  );
}

type OwnMatch = {
  data: DeveloperMatch | null;
  ineligibleReasons: string[];
  status: "open" | "closed";
};

function YourFit({
  opportunity,
  reloadOpportunity,
}: {
  opportunity: OpportunityRecord;
  reloadOpportunity: () => Promise<void>;
}) {
  const match = useApi<OwnMatch>(`/opportunities/${opportunity.id}/match`);
  const interest = useInterestFor(opportunity.id);
  const { pending, run, error } = useMutation();
  const mine = [...interest.byDeveloper.values()][0];
  const interested = mine?.developerInterested ?? false;
  const toggle = async (next: boolean) => {
    await run(
      "interest",
      `/opportunities/${opportunity.id}/interest`,
      { method: "PUT", body: JSON.stringify({ interested: next }) },
      next ? "Interest sent to the requester" : "Interest withdrawn",
    );
    await Promise.all([interest.reload(), match.reload(), reloadOpportunity()]);
  };
  if (match.error?.status === 404)
    return (
      <EmptyState
        icon={HandshakeIcon}
        title="Create your profile to see your fit"
        description="Your match is calculated from your skills, projects and learning goals."
        action={
          <Button
            render={
              <a
                href={withNext(
                  "/onboarding",
                  `/opportunities/${opportunity.id}`,
                )}
              />
            }
          >
            Create your profile
          </Button>
        }
      />
    );
  if (match.error)
    return (
      <ErrorAlert
        title="Your fit could not be calculated"
        message={match.error.message}
        onRetry={() => void match.reload()}
      />
    );
  if (!match.data) return <LoadingBlock rows={1} />;
  const fit = match.data;
  return (
    <Section title="Your next step">
      <Card>
        <CardPanel className="space-y-4 p-6">
          {interest.error && (
            <ErrorAlert
              title="Your response could not be loaded"
              message={interest.error.message}
              onRetry={() => void interest.reload()}
            />
          )}
          {fit.data ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                {mine?.connected && <Badge variant="success">Connected</Badge>}
                {!mine?.connected && mine?.requesterInterested && (
                  <Badge variant="info">
                    The requester is interested in you
                  </Badge>
                )}
              </div>
              <p className="text-sm">{fit.data.explanation}</p>
              <details className="border-t pt-3 text-sm">
                <summary className="cursor-pointer font-medium">
                  Match details · {Math.round(fit.data.score)}%
                </summary>
                <div className="mt-4">
                  <Scores scores={fit.data.scores} compact />
                </div>
              </details>
            </>
          ) : (
            <div className="space-y-2">
              <p className="font-medium">
                You're not eligible for this one yet
              </p>
              <ul className="list-disc ps-5 text-sm text-muted-foreground">
                {fit.ineligibleReasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
          )}
          <FieldMessage>{error}</FieldMessage>
          {mine?.connected && (
            <p className="text-sm">
              You and the requester are interested. Agree on scope, timing,
              compensation, and support before starting; this is not a work
              assignment or delivery confirmation. Messaging is not available in
              the app yet.
            </p>
          )}
          {interested && !mine?.connected && (
            <p role="status" className="text-sm">
              Your interest has been shared. You are not assigned to this
              project; wait for the requester’s response.
            </p>
          )}
          {fit.status === "closed" && (
            <p className="text-sm">
              This opportunity is closed to new interest.
            </p>
          )}
          {(fit.data || interested) && (
            <div className="flex flex-wrap items-center gap-3 border-t pt-4">
              <ConfirmButton
                confirmVariant={interested ? "destructive" : "default"}
                variant={interested ? "outline" : "default"}
                loading={pending === "interest"}
                disabled={
                  !!interest.error || (!interested && fit.status !== "open")
                }
                label={interested ? "Withdraw interest" : "Express interest"}
                title={
                  interested
                    ? "Withdraw your interest?"
                    : "Express interest in this project?"
                }
                description={
                  interested
                    ? "The requester will no longer see you as interested. Any mutual connection will end."
                    : "The requester will see your interest. You are not accepting a work assignment; a connection forms only if they are interested too."
                }
                confirmLabel={
                  interested ? "Withdraw interest" : "Express interest"
                }
                onConfirm={() => void toggle(!interested)}
              />
              <p className="text-xs text-muted-foreground">
                {interested
                  ? "The requester can see you're interested."
                  : "A connection forms only if the requester is interested too."}
              </p>
            </div>
          )}
        </CardPanel>
      </Card>
    </Section>
  );
}

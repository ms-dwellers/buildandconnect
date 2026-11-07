"use client";

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
      {({ user, role }) => <Loaded id={id} userId={user.id} role={role} />}
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
        title="This opportunity could not be loaded"
        message={opportunity.error.message}
        onRetry={() => void opportunity.reload()}
      />
    );
  if (!opportunity.data) return <LoadingBlock />;
  const job = opportunity.data;
  const owner = job.ownerId === userId;
  return (
    <div className="space-y-12">
      <Summary opportunity={job} owner={owner} />
      {owner && <Candidates opportunity={job} />}
      {role === "developer" && <YourFit opportunity={job} />}
    </div>
  );
}

function Summary({
  opportunity,
  owner,
}: {
  opportunity: OpportunityRecord;
  owner: boolean;
}) {
  const { analysis } = opportunity;
  return (
    <Card>
      <CardPanel className="space-y-5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <OpportunityStatusBadge status={opportunity.status} />
              <Badge variant="outline">
                {opportunity.kind === "paid" ? "Paid" : "Volunteer"}
              </Badge>
              {analysis.mentorshipAvailable && (
                <span className="text-xs text-primary">Mentorship offered</span>
              )}
            </div>
            <h2 className="font-display text-3xl leading-tight tracking-tight">
              {opportunity.title}
            </h2>
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
        <p className="whitespace-pre-line text-sm leading-7">
          {opportunity.description}
        </p>
        <dl className="grid gap-4 border-t pt-5 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">Compensation</dt>
            <dd className="mt-1 font-medium">
              {opportunity.compensation ??
                (opportunity.kind === "paid" ? "Paid" : "Volunteer")}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Commitment</dt>
            <dd className="mt-1 font-medium">
              {opportunity.commitment ??
                `${opportunity.minimumWeeklyHours}+ hrs / week`}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Difficulty</dt>
            <dd className="mt-1 font-medium">
              {analysis.difficulty} of 5 · {analysis.experienceLevel}
            </dd>
          </div>
          <div className="sm:col-span-3">
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
            <div className="sm:col-span-3">
              <dt className="text-xs text-muted-foreground">You could learn</dt>
              <dd className="mt-1">
                {analysis.learningOpportunities.join(", ")}
              </dd>
            </div>
          )}
        </dl>
        <p className="text-xs text-muted-foreground">
          Requirements are estimated from the description. Review them before
          acting on a match.
        </p>
      </CardPanel>
    </Card>
  );
}

function useInterestFor(opportunityId: string) {
  const interests = usePaged<Interest>("/interests", 100);
  const byDeveloper = useMemo(
    () =>
      new Map(
        interests.items
          .filter((item) => item.opportunityId === opportunityId)
          .map((item) => [item.developerId, item]),
      ),
    [interests.items, opportunityId],
  );
  return { byDeveloper, reload: interests.reload };
}

function Scores({ scores }: { scores: MatchScores }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-5">
      {FACTORS.map(([key, label]) => (
        <div key={key} className="flex justify-between gap-2 sm:block">
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
            const interested = current?.companyInterested ?? false;
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
                    <p className="text-sm text-muted-foreground">
                      {match.explanation}
                    </p>
                    <Scores scores={match.scores} />
                  </div>
                  <Button
                    variant={interested ? "outline" : "default"}
                    size="sm"
                    loading={pending === match.developerId}
                    onClick={() => void toggle(match.developerId, !interested)}
                  >
                    {interested ? "Withdraw interest" : "I'm interested"}
                  </Button>
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

function YourFit({ opportunity }: { opportunity: OpportunityRecord }) {
  const match = useApi<OwnMatch>(`/opportunities/${opportunity.id}/match`);
  const interest = useInterestFor(opportunity.id);
  const { pending, run } = useMutation();
  const mine = [...interest.byDeveloper.values()][0];
  const interested = mine?.developerInterested ?? false;
  const toggle = async (next: boolean) => {
    if (
      await run(
        "interest",
        `/opportunities/${opportunity.id}/interest`,
        { method: "PUT", body: JSON.stringify({ interested: next }) },
        next ? "Interest sent to the company" : "Interest withdrawn",
      )
    )
      await interest.reload();
  };
  if (match.error?.status === 404)
    return (
      <EmptyState
        icon={HandshakeIcon}
        title="Create your profile to see your fit"
        description="Your match is calculated from your skills, projects and learning goals."
        action={
          <Button render={<a href="/profile" />}>Create your profile</Button>
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
    <Section title="Your fit">
      <Card>
        <CardPanel className="space-y-4 p-6">
          {fit.data ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" size="lg">
                  {Math.round(fit.data.score)}% match
                </Badge>
                {mine?.connected && <Badge variant="success">Connected</Badge>}
                {!mine?.connected && mine?.companyInterested && (
                  <Badge variant="info">The company is interested in you</Badge>
                )}
              </div>
              <p className="text-sm">{fit.data.explanation}</p>
              <Scores scores={fit.data.scores} />
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
          {(fit.data || interested) && (
            <div className="flex flex-wrap items-center gap-3 border-t pt-4">
              <Button
                variant={interested ? "outline" : "default"}
                loading={pending === "interest"}
                disabled={!interested && fit.status !== "open"}
                onClick={() => void toggle(!interested)}
              >
                {interested ? "Withdraw interest" : "I'm interested"}
              </Button>
              <p className="text-xs text-muted-foreground">
                {interested
                  ? "The company can see you're interested."
                  : "A connection forms only if the company is interested too."}
              </p>
            </div>
          )}
        </CardPanel>
      </Card>
    </Section>
  );
}

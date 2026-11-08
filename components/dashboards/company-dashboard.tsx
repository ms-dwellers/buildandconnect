"use client";

import Link from "next/link";
import {
  BriefcaseBusinessIcon,
  HandshakeIcon,
  MapPinIcon,
  PlusIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePaged } from "@/lib/use-api";
import type { Interest, OpportunityRecord } from "@/lib/types";
import {
  ConfirmButton,
  EmptyState,
  ItemCard,
  ListState,
  OpportunityStatusBadge,
  Section,
  useMutation,
} from "./parts";

export function CompanyDashboard() {
  const opportunities = usePaged<OpportunityRecord>("/opportunities/mine");
  const interests = usePaged<Interest>("/interests");
  const { pending, run } = useMutation();
  const setStatus = async (
    opportunity: OpportunityRecord,
    status: "open" | "closed",
  ) => {
    const ok = await run(
      opportunity.id,
      `/opportunities/${opportunity.id}`,
      { method: "PATCH", body: JSON.stringify({ status }) },
      status === "open" ? "Opportunity reopened" : "Opportunity closed",
    );
    if (ok) await opportunities.reload();
  };

  return (
    <div className="space-y-12">
      <Button render={<Link href="/hire" />} variant="outline">
        Describe a project with voice
      </Button>
      <Section
        title="Your opportunities"
        description="Open opportunities with a map pin appear on the Calgary map."
      >
        <ListState
          {...opportunities}
          onRetry={() => void opportunities.reload()}
          onLoadMore={() => void opportunities.loadMore()}
          empty={
            <EmptyState
              icon={BriefcaseBusinessIcon}
              title="No opportunities yet"
              description="Post a paid or volunteer project to see developers ranked by growth fit."
              action={
                <Button render={<Link href="/opportunities/new" />}>
                  <PlusIcon aria-hidden="true" />
                  Post an opportunity
                </Button>
              }
            />
          }
        >
          {(opportunity) => (
            <li key={opportunity.id}>
              <ItemCard>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <OpportunityStatusBadge status={opportunity.status} />
                    <Badge variant="outline">
                      {opportunity.kind === "paid" ? "Paid" : "Volunteer"}
                    </Badge>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPinIcon aria-hidden="true" className="size-3.5" />
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
                <div className="flex flex-wrap gap-2">
                  <Button
                    render={<Link href={`/opportunities/${opportunity.id}`} />}
                    size="sm"
                  >
                    View candidates
                  </Button>
                  <Button
                    render={
                      <a href={`/opportunities/${opportunity.id}/edit`} />
                    }
                    variant="outline"
                    size="sm"
                  >
                    Edit
                  </Button>
                  {opportunity.status === "open" ? (
                    <ConfirmButton
                      label="Close"
                      title="Close this opportunity?"
                      description="It stops matching and leaves the map. Existing connections are kept, and you can reopen it later."
                      confirmLabel="Close opportunity"
                      variant="ghost"
                      size="sm"
                      loading={pending === opportunity.id}
                      onConfirm={() => void setStatus(opportunity, "closed")}
                    />
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      loading={pending === opportunity.id}
                      onClick={() => void setStatus(opportunity, "open")}
                    >
                      Reopen
                    </Button>
                  )}
                </div>
              </ItemCard>
            </li>
          )}
        </ListState>
      </Section>
      <InterestSection interests={interests} viewer="company" />
    </div>
  );
}

export function InterestSection({
  interests,
  viewer,
}: {
  interests: ReturnType<typeof usePaged<Interest>>;
  viewer: "company" | "developer";
}) {
  return (
    <Section
      title="Interest and connections"
      description="A connection forms when both sides say they're interested."
    >
      <ListState
        {...interests}
        onRetry={() => void interests.reload()}
        onLoadMore={() => void interests.loadMore()}
        empty={
          <EmptyState
            icon={HandshakeIcon}
            title="No interest yet"
            description={
              viewer === "company"
                ? "Express interest in a candidate from an opportunity's ranked list."
                : "Open an opportunity to see your fit and say you're interested."
            }
          />
        }
      >
        {(interest) => {
          const theirs =
            viewer === "company"
              ? interest.developerInterested
              : interest.companyInterested;
          return (
            <li key={interest.id}>
              <ItemCard>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <h3 className="font-semibold">{interest.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {viewer === "company"
                      ? interest.developerName
                      : interest.companyName}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {interest.connected ? (
                    <Badge variant="success">Connected</Badge>
                  ) : theirs ? (
                    <Badge variant="info">
                      {viewer === "company"
                        ? "Developer is interested"
                        : "Company is interested"}
                    </Badge>
                  ) : (
                    <Badge variant="outline">Waiting for a reply</Badge>
                  )}
                  <Button
                    render={
                      <a href={`/opportunities/${interest.opportunityId}`} />
                    }
                    variant="outline"
                    size="sm"
                  >
                    Open
                  </Button>
                </div>
              </ItemCard>
            </li>
          );
        }}
      </ListState>
    </Section>
  );
}

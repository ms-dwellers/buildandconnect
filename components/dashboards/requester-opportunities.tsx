"use client";

import { ArrowRightIcon, MapPinIcon } from "lucide-react";
import { StartChatButton } from "@/components/chat/start-chat-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePaged } from "@/lib/use-api";
import { DeveloperReviewForm } from "@/components/developer-review-form";
import type { Interest, OpportunityRecord } from "@/lib/types";
import {
  interestState,
  prioritizeInterests,
  prioritizeOpportunities,
} from "@/lib/dashboard";
import {
  ConfirmButton,
  ItemCard,
  ListState,
  OpportunityStatusBadge,
  Section,
  useMutation,
} from "./parts";

export function RequesterOpportunities({
  opportunities,
}: {
  opportunities: ReturnType<typeof usePaged<OpportunityRecord>>;
}) {
  const { pending, run } = useMutation();
  const setStatus = async (
    opportunity: OpportunityRecord,
    status: "open" | "closed",
  ) => {
    const ok = await run(
      opportunity.id,
      `/opportunities/${opportunity.id}`,
      { method: "PATCH", body: JSON.stringify({ status }) },
      status === "open" ? "Project reopened" : "Project closed",
    );
    if (ok) await opportunities.reload();
  };

  if (
    !opportunities.loading &&
    !opportunities.error &&
    !opportunities.items.length
  )
    return null;
  return (
    <Section title="Published projects">
      <ListState
        {...opportunities}
        items={prioritizeOpportunities(opportunities.items)}
        onRetry={() => void opportunities.reload()}
        onLoadMore={() => void opportunities.loadMore()}
        layout="grid"
        empty={null}
      >
        {(opportunity) => (
          <li key={opportunity.id}>
            <ItemCard>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <OpportunityStatusBadge status={opportunity.status} />
                  <span className="text-xs text-muted-foreground">
                    {opportunity.kind === "paid" ? "Paid" : "Volunteer"}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPinIcon aria-hidden="true" className="size-3.5" />
                    {opportunity.remote
                      ? "Remote"
                      : (opportunity.place ?? opportunity.city)}
                  </span>
                </div>
                <h3 className="text-xl font-semibold">{opportunity.title}</h3>
                <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                  {opportunity.description}
                </p>
              </div>
              <div className="w-full space-y-4">
                <Button
                  render={<a href={`/opportunities/${opportunity.id}`} />}
                  size="sm"
                  variant="outline"
                >
                  Review project <ArrowRightIcon aria-hidden="true" />
                </Button>
                <details className="dashboard-options">
                  <summary>Project options</summary>
                  <div className="mt-3 flex flex-wrap gap-3">
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
                        title="Close this project?"
                        description="It stops matching and leaves the map. Existing connections are kept, and you can reopen it later."
                        confirmLabel="Close project"
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
                </details>
              </div>
            </ItemCard>
          </li>
        )}
      </ListState>
    </Section>
  );
}

export function InterestSection({
  interests,
  viewer,
}: {
  interests: ReturnType<typeof usePaged<Interest>>;
  viewer: "requester" | "developer";
}) {
  if (!interests.loading && !interests.error && !interests.items.length)
    return null;
  return (
    <Section title="Responses and connections">
      <ListState
        {...interests}
        items={prioritizeInterests(interests.items, viewer)}
        onRetry={() => void interests.reload()}
        onLoadMore={() => void interests.loadMore()}
        layout="rows"
        empty={null}
      >
        {(interest) => {
          const state = interestState(interest, viewer);
          return (
            <li
              key={interest.id}
              className="flex flex-wrap items-center justify-between gap-4 p-5 sm:px-6 [overflow-wrap:anywhere]"
            >
              <div className="min-w-0 flex-1 basis-48 space-y-1.5">
                <h3 className="text-lg font-semibold">{interest.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {viewer === "requester"
                    ? interest.developerName
                    : interest.requesterName}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {interest.connected && (
                  <StartChatButton
                    opportunityId={interest.opportunityId}
                    developerId={interest.developerId}
                  />
                )}
                {viewer === "requester" && (
                  <>
                    <Button
                      render={
                        <a
                          href={`/developers/${encodeURIComponent(interest.developerId)}`}
                        />
                      }
                      variant="outline"
                      size="sm"
                    >
                      View profile
                    </Button>
                    {interest.connected && (
                      <DeveloperReviewForm
                        opportunityId={interest.opportunityId}
                        developerId={interest.developerId}
                        name={interest.developerName}
                      />
                    )}
                  </>
                )}
                {state === "connected" ? (
                  <Badge variant="success">Connected</Badge>
                ) : state === "needs-response" ? (
                  <Badge variant="info">Needs your response</Badge>
                ) : state === "withdrawn" ? (
                  <Badge variant="outline">Interest withdrawn</Badge>
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
                  {viewer === "requester"
                    ? "Review developer"
                    : "Review project"}
                </Button>
              </div>
            </li>
          );
        }}
      </ListState>
    </Section>
  );
}

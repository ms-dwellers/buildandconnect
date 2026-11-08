"use client";

import {
  FilePenLineIcon,
  HandshakeIcon,
  MapPinIcon,
  PlusIcon,
  SproutIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardPanel } from "@/components/ui/card";
import { useApi, usePaged } from "@/lib/use-api";
import {
  InterestSection,
  RequesterOpportunities,
} from "./requester-opportunities";
import { DraftList } from "@/components/projects/draft-list";
import type { Interest, OpportunityRecord, RequestRecord } from "@/lib/types";
import type { ProjectDraftRecord } from "@/backend/project-drafts";
import { prioritizeRequests } from "@/lib/dashboard";
import {
  ConfirmButton,
  ItemCard,
  ListState,
  RequestStatusBadge,
  useMutation,
} from "./parts";

export function RequesterDashboard() {
  const requests = usePaged<RequestRecord>("/requests");
  const interests = usePaged<Interest>("/interests");
  const opportunities = usePaged<OpportunityRecord>("/opportunities/mine");
  const drafts = useApi<ProjectDraftRecord[]>("/project-drafts");
  const newWorkspace =
    !requests.loading &&
    !requests.error &&
    !requests.items.length &&
    !interests.loading &&
    !interests.error &&
    !interests.items.length &&
    !opportunities.loading &&
    !opportunities.error &&
    !opportunities.items.length &&
    drafts.data?.length === 0 &&
    !drafts.error;
  const { pending, run } = useMutation();
  const act = async (request: RequestRecord, action: "close" | "release") => {
    const ok =
      action === "close"
        ? await run(
            request.id,
            `/requests/${request.id}`,
            { method: "PATCH", body: JSON.stringify({ status: "closed" }) },
            "Request closed",
          )
        : await run(
            request.id,
            `/requests/${request.id}/release`,
            { method: "POST" },
            "Request reopened for other developers",
          );
    if (ok) await requests.reload();
  };

  return (
    <div className="space-y-9">
      <InterestSection interests={interests} viewer="requester" />
      <DraftList drafts={drafts} />
      <RequesterOpportunities opportunities={opportunities} />
      {newWorkspace && <ProjectBeginning />}
      <details
        className="dashboard-disclosure"
        open={requests.items.length > 0 || !!requests.error}
      >
        <summary>Local community requests</summary>
        <div className="mt-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="max-w-lg text-sm leading-6 text-muted-foreground">
              For a small, local volunteer task. One developer can accept it
              directly.
            </p>
            <Button
              render={<a href="/requests/new" />}
              variant="outline"
              size="sm"
            >
              <PlusIcon aria-hidden="true" />
              Post a local request
            </Button>
          </div>
          <ListState
            {...requests}
            items={prioritizeRequests(requests.items)}
            onRetry={() => void requests.reload()}
            onLoadMore={() => void requests.loadMore()}
            empty={null}
          >
            {(request) => (
              <li key={request.id}>
                <ItemCard>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <RequestStatusBadge status={request.status} />
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPinIcon aria-hidden="true" className="size-3.5" />
                        {request.place}
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold">{request.title}</h3>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {request.description}
                    </p>
                    {request.claimantName && (
                      <p className="text-sm">
                        Accepted by{" "}
                        <span className="font-medium">
                          {request.claimantName}
                        </span>
                      </p>
                    )}
                  </div>
                  <div className="w-full space-y-4">
                    <Button
                      render={<a href={`/requests/${request.id}`} />}
                      variant="outline"
                      size="sm"
                    >
                      View request
                    </Button>
                    <details className="dashboard-options">
                      <summary>Request options</summary>
                      <div className="mt-3 flex flex-wrap gap-3">
                        {request.status === "open" && (
                          <Button
                            render={<a href={`/requests/${request.id}/edit`} />}
                            variant="outline"
                            size="sm"
                          >
                            Edit
                          </Button>
                        )}
                        {request.status !== "closed" && (
                          <Button
                            render={<a href={`/map?focus=${request.id}`} />}
                            variant="ghost"
                            size="sm"
                          >
                            View on map
                          </Button>
                        )}
                        {request.status === "claimed" && (
                          <ConfirmButton
                            label="Release"
                            title="Release this request?"
                            description={`${request.claimantName ?? "The developer"} will no longer be assigned, and the request reopens for other developers nearby.`}
                            confirmLabel="Release request"
                            variant="outline"
                            size="sm"
                            loading={pending === request.id}
                            onConfirm={() => void act(request, "release")}
                          />
                        )}
                        {request.status !== "closed" && (
                          <ConfirmButton
                            label="Close"
                            title="Close this request?"
                            description="It will be removed from the map. Closed requests can't be reopened or edited."
                            confirmLabel="Close request"
                            variant="ghost"
                            size="sm"
                            loading={pending === request.id}
                            onConfirm={() => void act(request, "close")}
                          />
                        )}
                      </div>
                    </details>
                  </div>
                </ItemCard>
              </li>
            )}
          </ListState>
        </div>
      </details>
    </div>
  );
}

function ProjectBeginning() {
  return (
    <Card className="shadow-none">
      <CardPanel className="space-y-7 p-6 sm:p-8">
        <h2 className="text-2xl">From a real need to a shared project</h2>
        <ol className="grid gap-7 sm:grid-cols-3">
          {[
            {
              icon: SproutIcon,
              title: "Describe the need",
              text: "Talk it through or write it yourself. No technical brief needed.",
            },
            {
              icon: FilePenLineIcon,
              title: "Make it yours",
              text: "Review and edit a private draft. Publish only when you’re ready.",
            },
            {
              icon: HandshakeIcon,
              title: "Find your people",
              text: "Review interested developers. Connect when the interest is mutual.",
            },
          ].map(({ icon: Icon, title, text }) => (
            <li key={title} className="space-y-3">
              <Icon
                aria-hidden="true"
                className="size-6 text-primary"
                strokeWidth={1.5}
              />
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="max-w-xs text-sm leading-6 text-muted-foreground">
                {text}
              </p>
            </li>
          ))}
        </ol>
      </CardPanel>
    </Card>
  );
}

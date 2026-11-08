"use client";

import Link from "next/link";
import { HeartHandshakeIcon, MapPinIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePaged } from "@/lib/use-api";
import type { RequestRecord } from "@/lib/types";
import {
  ConfirmButton,
  EmptyState,
  ItemCard,
  ListState,
  RequestStatusBadge,
  Section,
  useMutation,
} from "./parts";

export function RequesterDashboard() {
  const requests = usePaged<RequestRecord>("/requests");
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
    <Section
      title="Your requests"
      description="Open requests appear on the map for nearby developers."
    >
      <ListState
        {...requests}
        onRetry={() => void requests.reload()}
        onLoadMore={() => void requests.loadMore()}
        empty={
          <EmptyState
            icon={HeartHandshakeIcon}
            title="No requests yet"
            description="Describe something your neighbourhood needs and pin where help is needed."
            action={
              <Button render={<Link href="/requests/new" />}>
                <PlusIcon aria-hidden="true" />
                Post a request
              </Button>
            }
          />
        }
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
                <h3 className="font-semibold">{request.title}</h3>
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {request.description}
                </p>
                {request.claimantName && (
                  <p className="text-sm">
                    Accepted by{" "}
                    <span className="font-medium">{request.claimantName}</span>
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {request.status === "open" && (
                  <Button
                    render={<Link href={`/requests/${request.id}/edit`} />}
                    variant="outline"
                    size="sm"
                  >
                    Edit
                  </Button>
                )}
                {request.status !== "closed" && (
                  <Button
                    render={<Link href={`/map?focus=${request.id}`} />}
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
            </ItemCard>
          </li>
        )}
      </ListState>
    </Section>
  );
}

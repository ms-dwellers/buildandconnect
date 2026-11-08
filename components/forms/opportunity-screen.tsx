"use client";

import {
  ErrorAlert,
  LoadingBlock,
  RequireRole,
} from "@/components/app/require-role";
import { useApi } from "@/lib/use-api";
import type { OpportunityRecord } from "@/lib/types";
import { OpportunityForm } from "./opportunity-form";

export function OpportunityScreen({ id }: { id: string }) {
  return (
    <RequireRole roles={["requester"]}>
      {({ user }) => (
        <EditOpportunity key={`${id}:${user.id}`} id={id} userId={user.id} />
      )}
    </RequireRole>
  );
}

function EditOpportunity({ id, userId }: { id: string; userId: string }) {
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
  if (!opportunity.data) return <LoadingBlock rows={2} />;
  if (opportunity.data.ownerId !== userId)
    return (
      <ErrorAlert
        title="You can't edit this opportunity"
        message="Only the requester who posted it can make changes."
      />
    );
  return <OpportunityForm initial={opportunity.data} />;
}

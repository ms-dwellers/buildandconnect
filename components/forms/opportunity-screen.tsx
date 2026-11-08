"use client";

import type { Pin } from "@/components/MapPinPicker";
import {
  ErrorAlert,
  LoadingBlock,
  RequireRole,
} from "@/components/app/require-role";
import { useApi } from "@/lib/use-api";
import type { OpportunityRecord } from "@/lib/types";
import { OpportunityForm } from "./opportunity-form";
import { useState } from "react";
import { useOpportunityDraft } from "@/lib/opportunity-draft-context";
import { opportunityDraftFromBrief } from "@/lib/opportunity-draft";

export function OpportunityScreen({
  id,
  defaultPin,
  draftId,
}: {
  id?: string;
  defaultPin?: Pin | null;
  draftId?: string;
}) {
  return (
    <RequireRole roles={["requester"]}>
      {({ user }) =>
        id ? (
          <EditOpportunity id={id} userId={user.id} />
        ) : (
          <NewOpportunity
            key={`${user.id}:${draftId ?? "new"}`}
            defaultPin={defaultPin}
            draftId={draftId}
          />
        )
      }
    </RequireRole>
  );
}

function NewOpportunity({
  defaultPin,
  draftId,
}: {
  defaultPin?: Pin | null;
  draftId?: string;
}) {
  const handoff = useOpportunityDraft();
  const [brief] = useState(() => (draftId ? handoff.read(draftId) : undefined));
  const [draft] = useState(() =>
    brief ? opportunityDraftFromBrief(brief) : undefined,
  );
  const clear = () => {
    if (draftId) handoff.clear(draftId);
  };
  return (
    <div className="space-y-5">
      {draftId && !draft && (
        <ErrorAlert
          title="Brief draft unavailable"
          message="Return to your brief and choose Post an opportunity again, or fill in the form below."
        />
      )}
      <OpportunityForm
        draft={draft}
        defaultPin={defaultPin}
        onSubmitted={clear}
        onCancel={clear}
      />
    </div>
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

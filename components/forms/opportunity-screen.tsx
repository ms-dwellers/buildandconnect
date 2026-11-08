"use client";

import { useMemo } from "react";
import type { Pin } from "@/components/MapPinPicker";
import {
  ErrorAlert,
  LoadingBlock,
  RequireRole,
} from "@/components/app/require-role";
import { takeOpportunityDraft } from "@/lib/opportunity-draft";
import { useApi } from "@/lib/use-api";
import type { OpportunityRecord } from "@/lib/types";
import { OpportunityForm } from "./opportunity-form";

export function OpportunityScreen({
  id,
  defaultPin,
}: {
  id?: string;
  defaultPin?: Pin | null;
}) {
  // A draft handed over from the voice brief is read once, on the client.
  const draft = useMemo(() => (id ? null : takeOpportunityDraft()), [id]);
  return (
    <RequireRole roles={["company"]}>
      {({ user }) =>
        id ? (
          <EditOpportunity id={id} userId={user.id} />
        ) : (
          <>
            {draft && (
              <p className="mb-4 text-sm text-muted-foreground">
                Prefilled from your voice brief. Check every field before you
                post.
              </p>
            )}
            <OpportunityForm
              defaultPin={defaultPin}
              draft={draft ?? undefined}
            />
          </>
        )
      }
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
        message="Only the company that posted it can make changes."
      />
    );
  return <OpportunityForm initial={opportunity.data} />;
}

"use client";

import { CircleAlertIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { Pin } from "@/components/MapPinPicker";
import {
  ErrorAlert,
  LoadingBlock,
  RequireRole,
} from "@/components/app/require-role";
import { useApi } from "@/lib/use-api";
import type { RequestRecord } from "@/lib/types";
import { RequestForm } from "./request-form";

export function RequestScreen({
  id,
  defaultPin,
}: {
  id?: string;
  defaultPin?: Pin | null;
}) {
  return (
    <RequireRole roles={["requester"]}>
      {() =>
        id ? <EditRequest id={id} /> : <RequestForm defaultPin={defaultPin} />
      }
    </RequireRole>
  );
}

function EditRequest({ id }: { id: string }) {
  const request = useApi<RequestRecord>(`/requests/${encodeURIComponent(id)}`);
  if (request.error)
    return (
      <ErrorAlert
        title="This request could not be loaded"
        message={request.error.message}
        onRetry={() => void request.reload()}
      />
    );
  if (!request.data) return <LoadingBlock rows={2} />;
  if (request.data.status !== "open")
    return (
      <Alert variant="info">
        <CircleAlertIcon aria-hidden="true" />
        <AlertTitle>
          {request.data.status === "claimed"
            ? "Release the claim to edit this request"
            : "Closed requests can't be edited"}
        </AlertTitle>
        <AlertDescription>
          <p>
            {request.data.status === "claimed"
              ? `${request.data.claimantName ?? "A developer"} has accepted it. Editing could change what they agreed to.`
              : "Post a new request if you still need help."}
          </p>
          <Button
            render={<a href="/dashboard" />}
            variant="outline"
            size="sm"
            className="mt-2"
          >
            Back to your requests
          </Button>
        </AlertDescription>
      </Alert>
    );
  return <RequestForm initial={request.data} />;
}

"use client";

import { FieldMessage } from "@/components/forms/form-kit";
import { Button } from "@/components/ui/button";
import { Card, CardPanel } from "@/components/ui/card";
import {
  RequireRole,
  ErrorAlert,
  LoadingBlock,
} from "@/components/app/require-role";
import {
  ConfirmButton,
  RequestStatusBadge,
  useMutation,
} from "@/components/dashboards/parts";
import { ProjectScope } from "@/components/project-scope";
import { ProjectSkillEvidence } from "@/components/project-skill-evidence";
import { useApi } from "@/lib/use-api";
import type { DeveloperMatch, RequestRecord, Role } from "@/lib/types";
import { withNext } from "@/lib/navigation";

export function RequestDetail({ id }: { id: string }) {
  return (
    <RequireRole>
      {({ user, role }) => (
        <Detail key={`${id}:${user.id}`} id={id} userId={user.id} role={role} />
      )}
    </RequireRole>
  );
}

function Detail({
  id,
  userId,
  role,
}: {
  id: string;
  userId: string;
  role: Role;
}) {
  const request = useApi<RequestRecord>(`/requests/${encodeURIComponent(id)}`);
  if (request.error)
    return (
      <div className="space-y-4">
        <ErrorAlert
          title="Project unavailable"
          message={request.error.message}
          onRetry={() => void request.reload()}
        />
        <Button render={<a href="/career" />} variant="outline">
          Find another project
        </Button>
      </div>
    );
  if (!request.data) return <LoadingBlock />;
  const item = request.data;
  const owner = item.ownerId === userId;
  return (
    <Card>
      <CardPanel className="space-y-6 p-5 sm:p-8">
        <div className="space-y-2">
          <RequestStatusBadge status={item.status} />
          <h2 className="text-2xl font-semibold">{item.title}</h2>
          <p className="text-sm text-muted-foreground">
            {item.ownerName} · {item.place}
          </p>
        </div>
        <p className="whitespace-pre-line text-sm leading-7">
          {item.description}
        </p>
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-medium">Compensation</dt>
            <dd>Volunteer · Unpaid</dd>
          </div>
          <div>
            <dt className="font-medium">Time commitment</dt>
            <dd>
              Not specified. Agree on hours and a deadline with the requester.
            </dd>
          </div>
        </dl>
        <ProjectScope analysis={item.analysis} />
        {owner ? (
          <div className="space-y-3 border-t pt-5">
            <h3 className="font-semibold">
              {item.status === "claimed"
                ? `Accepted by ${item.claimantName ?? "a developer"}`
                : item.status === "open"
                  ? "Waiting for a developer"
                  : "Request closed"}
            </h3>
            {item.status === "claimed" && (
              <p className="text-sm">
                Review the expected work, time commitment, and support together
                before work starts. Acceptance is not a completed delivery.
              </p>
            )}
            <Button render={<a href="/dashboard" />} variant="outline">
              Manage request
            </Button>
          </div>
        ) : (
          role === "developer" && (
            <RequestCommitment
              item={item}
              mine={item.claimedBy === userId}
              reload={request.reload}
            />
          )
        )}
        {(owner || item.claimedBy === userId) && (
          <ProjectSkillEvidence
            source="request"
            projectId={item.id}
            owner={owner}
            canSubmit={item.claimedBy === userId}
          />
        )}
      </CardPanel>
    </Card>
  );
}

function RequestCommitment({
  item,
  mine,
  reload,
}: {
  item: RequestRecord;
  mine: boolean;
  reload: () => Promise<void>;
}) {
  const fit = useApi<{
    ineligibleReasons: string[];
    data?: DeveloperMatch | null;
    considerations?: string[];
  }>(`/requests/${encodeURIComponent(item.id)}/match`);
  const { pending, run, error } = useMutation();
  async function act(action: "accept" | "release") {
    await run(
      item.id,
      `/requests/${encodeURIComponent(item.id)}/${action}`,
      { method: "POST" },
      action === "accept" ? "Request accepted" : "Request released",
    );
    await Promise.all([reload(), fit.reload()]);
  }
  return (
    <div className="space-y-4 border-t pt-5">
      <h3 className="font-semibold">
        {mine ? "You accepted this request" : "Take on this request"}
      </h3>
      <FieldMessage>{error}</FieldMessage>
      {fit.data?.data && !mine && (
        <p className="text-sm leading-6">{fit.data.data.explanation}</p>
      )}
      {!mine && !!fit.data?.considerations?.length && (
        <div className="space-y-2 text-sm">
          <p className="font-medium">Discuss before starting</p>
          <ul className="list-disc space-y-1 ps-5 text-muted-foreground">
            {fit.data.considerations.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          <p className="text-muted-foreground">
            These are things to agree on, not reasons you cannot contribute.
          </p>
        </div>
      )}
      {mine ? (
        <>
          <p className="text-sm">
            The requester can see your name. Agree on scope, timing, and support
            before starting. Record skills below after you have contributed real
            work.
          </p>
          {item.status === "claimed" && (
            <ConfirmButton
              label="Release request"
              title="Release this request?"
              description="It will reopen for other developers, and you will no longer be assigned."
              confirmLabel="Release request"
              variant="outline"
              loading={pending !== null}
              onConfirm={() => void act("release")}
            />
          )}
        </>
      ) : fit.error ? (
        <ErrorAlert
          title="Eligibility could not be checked"
          message={fit.error.message}
          onRetry={() => void fit.reload()}
        />
      ) : !fit.data ? (
        <LoadingBlock rows={1} />
      ) : fit.data.ineligibleReasons.length ? (
        <>
          <ul className="list-disc ps-5 text-sm">
            {fit.data.ineligibleReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          <Button
            render={
              <a
                href={`${withNext("/profile", `/requests/${item.id}`)}#area`}
              />
            }
            variant="outline"
          >
            Review profile and area
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm">
            Accepting assigns this volunteer request to you and removes it from
            other developers’ open-project lists.
          </p>
          <ConfirmButton
            label="Accept request"
            confirmVariant="default"
            title="Accept this volunteer request?"
            description="You will be the assigned developer, and the requester will see your name. Confirm the scope and time commitment before starting work."
            confirmLabel="Accept request"
            loading={pending !== null}
            onConfirm={() => void act("accept")}
          />
        </>
      )}
      <Button render={<a href="/dashboard" />} variant="ghost">
        Go to dashboard
      </Button>
    </div>
  );
}

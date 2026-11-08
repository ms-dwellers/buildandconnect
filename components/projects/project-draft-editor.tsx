"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ZodError } from "zod";
import { issuesToErrors } from "@/components/forms/form-kit";
import { Button } from "@/components/ui/button";
import {
  RequireRole,
  ErrorAlert,
  LoadingBlock,
} from "@/components/app/require-role";
import { ConfirmButton } from "@/components/dashboards/parts";
import { OpportunityForm } from "@/components/forms/opportunity-form";
import { useApi } from "@/lib/use-api";
import {
  opportunityFromDraft,
  type ProjectDraftContent,
  type ProjectDraftRecord,
} from "@/backend/project-drafts";
import { api } from "@/lib/api";
import { withNext } from "@/lib/navigation";
import { useDraftSave } from "./use-draft-save";

export function ProjectDraftEditor({ id }: { id: string }) {
  return (
    <RequireRole roles={["requester"]}>
      {({ user }) => <LoadDraft key={`${user.id}:${id}`} id={id} />}
    </RequireRole>
  );
}
function LoadDraft({ id }: { id: string }) {
  const draft = useApi<ProjectDraftRecord>(
    `/project-drafts/${encodeURIComponent(id)}`,
  );
  if (draft.error)
    return (
      <ErrorAlert
        title="Draft could not be loaded"
        message={draft.error.message}
        onRetry={() => void draft.reload()}
      />
    );
  if (!draft.data) return <LoadingBlock />;
  if (draft.data.publishedOpportunityId)
    return (
      <div className="space-y-4">
        <p>This draft has been published.</p>
        <Button
          render={
            <a href={`/opportunities/${draft.data.publishedOpportunityId}`} />
          }
        >
          View opportunity
        </Button>
      </div>
    );
  return (
    <Editor
      key={draft.data.updatedAt}
      initial={draft.data}
      reload={draft.reload}
    />
  );
}
function Editor({
  initial,
  reload,
}: {
  initial: ProjectDraftRecord;
  reload: () => Promise<void>;
}) {
  const save = useDraftSave(initial);
  const router = useRouter();
  const working = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  async function publish(content: ProjectDraftContent) {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setError("");
    setValidationErrors({});
    save.change(content);
    try {
      opportunityFromDraft(content);
      if (!(await save.flush())) return;
      const response = await api<{ id: string }>(
        `/project-drafts/${initial.id}/publish`,
        {
          method: "POST",
          body: JSON.stringify({
            expectedUpdatedAt: save.saved.current.updatedAt,
          }),
          signal: AbortSignal.timeout(70_000),
        },
      );
      if (!response.ok) {
        setValidationErrors(issuesToErrors(response.issues));
        setError(response.error);
        return;
      }
      router.push(`/opportunities/${response.data.id}`);
    } catch (failure) {
      if (failure instanceof ZodError)
        setValidationErrors(
          issuesToErrors(
            failure.issues.map((issue) => ({
              path: issue.path.map(String),
              message: issue.message,
            })),
          ),
        );
      setError(
        failure instanceof Error && "issues" in failure
          ? "Check the required fields and publishing limits before continuing."
          : "Publishing could not be confirmed. Your draft is saved; retrying will not create a duplicate opportunity.",
      );
    } finally {
      working.current = false;
      setBusy(false);
    }
  }
  async function exit() {
    if (await save.flush()) router.push("/dashboard");
  }
  async function discard() {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    try {
      if (!(await save.flush())) return;
      const response = await api(`/project-drafts/${initial.id}`, {
        method: "DELETE",
        body: JSON.stringify({
          expectedUpdatedAt: save.saved.current.updatedAt,
        }),
      });
      if (!response.ok) {
        setError(response.error);
        return;
      }
      router.push("/dashboard");
    } catch {
      setError("Draft could not be discarded. Try again.");
    } finally {
      working.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5">
      <p role="status" className="text-sm text-muted-foreground">
        {save.status}
      </p>
      <p className="text-sm">
        Review and edit your project here. Nothing is public until you choose
        Publish opportunity.
      </p>
      {(error || save.error) && (
        <ErrorAlert
          title={save.error ? "Draft not saved" : "Action not completed"}
          message={error || save.error}
        />
      )}
      {save.conflict ? (
        <ConfirmButton
          label="Reload saved draft"
          title="Load the saved draft?"
          description="Your unsaved edits in this tab will be replaced with the latest saved version."
          confirmLabel="Load saved draft"
          variant="outline"
          onConfirm={() => void reload()}
        />
      ) : (
        save.error && (
          <div className="flex flex-wrap gap-3">
            {save.authRequired && (
              <Button
                variant="outline"
                render={
                  <a
                    href={withNext("/sign-in", "/dashboard")}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
              >
                Sign in in a new tab
              </Button>
            )}
            <Button variant="outline" onClick={() => void save.flush()}>
              Retry saving
            </Button>
          </div>
        )
      )}
      <OpportunityForm
        validationErrors={validationErrors}
        draftContent={initial.content}
        onDraftChange={save.change}
        onPublish={publish}
        busy={busy}
        actions={
          <div className="flex flex-wrap gap-3">
            <Button type="submit" loading={busy} disabled={save.conflict}>
              Publish opportunity
            </Button>
            <Button variant="outline" onClick={() => void exit()}>
              Save and exit
            </Button>
          </div>
        }
      />
      <ConfirmButton
        label="Discard draft"
        title="Discard this draft?"
        description="The saved project draft will be permanently removed. Nothing will be published."
        confirmLabel="Discard draft"
        variant="ghost"
        disabled={busy}
        onConfirm={() => void discard()}
      />
    </div>
  );
}

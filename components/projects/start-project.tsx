"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RequireRole, ErrorAlert } from "@/components/app/require-role";
import { Button } from "@/components/ui/button";
import { Card, CardPanel } from "@/components/ui/card";
import { createProjectDraft } from "@/lib/project-drafts";
import { emptyProjectDraft } from "@/backend/project-drafts";

export function StartProject() {
  return <RequireRole roles={["requester"]}>{() => <Start />}</RequireRole>;
}
function Start() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const id = useRef<string | null>(null);
  const pending = useRef(false);
  const router = useRouter();
  async function manual() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      id.current ??= crypto.randomUUID();
      const draft = await createProjectDraft(emptyProjectDraft(), id.current);
      router.push(`/projects/drafts/${draft.id}`);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Draft could not be created. Try again.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Card>
          <CardPanel className="space-y-4 p-6">
            <h2 className="text-xl font-semibold">Talk it through</h2>
            <p className="text-sm text-muted-foreground">
              Describe the problem in your own words. Review the project before
              publishing.
            </p>
            <Button render={<a href="/voice" />}>
              Start voice conversation
            </Button>
          </CardPanel>
        </Card>
        <Card>
          <CardPanel className="space-y-4 p-6">
            <h2 className="text-xl font-semibold">Write it yourself</h2>
            <p className="text-sm text-muted-foreground">
              Fill in the same project form, with no microphone or AI
              conversation.
            </p>
            <Button
              variant="outline"
              loading={busy}
              onClick={() => void manual()}
            >
              Fill out manually
            </Button>
          </CardPanel>
        </Card>
      </div>
      {error && <ErrorAlert title="Draft not created" message={error} />}
      <Button render={<a href="/requests/new" />} variant="ghost">
        Post a short local volunteer request instead
      </Button>
    </div>
  );
}

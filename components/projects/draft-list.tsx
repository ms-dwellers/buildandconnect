"use client";

import { Button } from "@/components/ui/button";
import { Card, CardPanel } from "@/components/ui/card";
import { ErrorAlert } from "@/components/app/require-role";
import { useApi } from "@/lib/use-api";
import type { ProjectDraftRecord } from "@/backend/project-drafts";

export function DraftList() {
  const drafts = useApi<ProjectDraftRecord[]>("/project-drafts");
  if (drafts.error)
    return (
      <ErrorAlert
        title="Saved drafts could not be loaded"
        message={drafts.error.message}
        onRetry={() => void drafts.reload()}
      />
    );
  if (!drafts.data?.length) return null;
  return (
    <section className="space-y-4" aria-labelledby="drafts-heading">
      <h2 id="drafts-heading" className="text-lg font-semibold">
        Saved project drafts
      </h2>
      <ul className="space-y-3">
        {drafts.data.map((draft) => (
          <li key={draft.id}>
            <Card>
              <CardPanel className="flex flex-wrap items-center justify-between gap-3 p-5">
                <div>
                  <h3 className="font-semibold">
                    {draft.content.title.trim() || "Untitled project"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Private draft · Not published
                  </p>
                </div>
                <Button
                  render={<a href={`/projects/drafts/${draft.id}`} />}
                  variant="outline"
                >
                  Continue draft
                </Button>
              </CardPanel>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { Card, CardPanel } from "@/components/ui/card";
import { ErrorAlert } from "@/components/app/require-role";
import { useApi } from "@/lib/use-api";
import type { ProjectDraftRecord } from "@/backend/project-drafts";

export function DraftList({
  drafts,
}: {
  drafts: ReturnType<typeof useApi<ProjectDraftRecord[]>>;
}) {
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
      <h2 id="drafts-heading" className="text-2xl font-semibold tracking-tight">
        Saved drafts
      </h2>
      <ul className="grid gap-4 sm:grid-cols-2">
        {drafts.data.map((draft) => (
          <li key={draft.id}>
            <Card className="h-full border-dashed bg-transparent shadow-none">
              <CardPanel className="flex flex-wrap items-center justify-between gap-4 p-6 [overflow-wrap:anywhere]">
                <div>
                  <h3 className="text-lg font-semibold">
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

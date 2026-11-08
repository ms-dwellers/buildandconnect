"use client";

import { useState } from "react";
import {
  RequireRole,
  ErrorAlert,
  LoadingBlock,
} from "@/components/app/require-role";
import { Button } from "@/components/ui/button";
import { Card, CardPanel } from "@/components/ui/card";
import type { SavedCareerTarget } from "@/lib/career";
import { TargetEditor } from "./target-editor";
import { CareerProjects } from "./career-projects";
import { useApi } from "@/lib/use-api";

export function CareerPath() {
  return (
    <RequireRole roles={["developer"]}>
      {({ user }) => <Path key={user.id} />}
    </RequireRole>
  );
}

function Path() {
  const target = useApi<SavedCareerTarget | null>(
    "/developers/me/career-target",
  );
  const [editing, setEditing] = useState(false);
  if (target.error)
    return (
      <ErrorAlert
        title="Career target could not be loaded"
        message={target.error.message}
        onRetry={() => void target.reload()}
      />
    );
  if (target.data === undefined || target.loading) return <LoadingBlock />;
  const saved = target.data;
  const reload = async () => {
    setEditing(false);
    await target.reload();
  };
  return (
    <div className="space-y-8">
      <Card>
        <CardPanel className="space-y-5 p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="text-xl font-semibold">
              {saved && !editing ? saved.title : "Choose a target job"}
            </h2>
            {saved && !editing && (
              <Button variant="outline" onClick={() => setEditing(true)}>
                Edit target
              </Button>
            )}
          </div>
          {!saved || editing ? (
            <TargetEditor
              key={saved?.updatedAt ?? "new"}
              initial={saved}
              onSaved={reload}
              onCancel={() => setEditing(false)}
              onReload={reload}
            />
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Private career target · Requirements come from this posting, not
                the whole job market.
              </p>
              {saved.sourceUrl && (
                <a
                  className="text-sm underline underline-offset-4"
                  href={saved.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View original job posting
                </a>
              )}
              <details className="text-sm">
                <summary className="cursor-pointer font-medium">
                  Job description
                </summary>
                <p className="mt-3 whitespace-pre-wrap leading-6">
                  {saved.sourceText}
                </p>
              </details>
            </>
          )}
        </CardPanel>
      </Card>
      {saved && !editing && (
        <CareerProjects
          key={saved.updatedAt}
          target={saved}
          onReloadTarget={reload}
        />
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { AppShell } from "@/components/app/app-shell";
import { ErrorAlert } from "@/components/app/require-role";
import { Button } from "@/components/ui/button";

/** Shown when a page throws while rendering; nothing here depends on the page. */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AppShell
      title="Something went wrong"
      description="The page hit an error while loading. Your data is unchanged."
      width="narrow"
    >
      <div className="space-y-4">
        <ErrorAlert
          title="This page could not be shown"
          message={
            error.digest
              ? `Reference ${error.digest}. Try again, or come back in a moment.`
              : "Try again, or come back in a moment."
          }
          onRetry={reset}
        />
        <Button render={<Link href="/" />} variant="outline">
          Back to the home page
        </Button>
      </div>
    </AppShell>
  );
}

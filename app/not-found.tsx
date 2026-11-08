import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/app/app-shell";
import { MapJourneyLink } from "@/components/map/map-journey";
import { Button } from "@/components/ui/button";
import { pageTitle } from "@/lib/page-title";

export const metadata: Metadata = { title: pageTitle("Page not found") };

export default function NotFound() {
  return (
    <AppShell
      title="That page isn't here"
      description="The link may be old, or the record it pointed to has been closed."
      width="narrow"
    >
      <div className="flex flex-wrap gap-3">
        <Button render={<Link href="/" />}>Back to the home page</Button>
        <MapJourneyLink variant="outline">Browse the map</MapJourneyLink>
      </div>
    </AppShell>
  );
}

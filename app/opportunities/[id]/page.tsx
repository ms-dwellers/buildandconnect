import type { Metadata } from "next";
import { pageTitle } from "@/lib/page-title";
import { AppShell } from "@/components/app/app-shell";
import { OpportunityDetail } from "@/components/opportunity-detail";

export const metadata: Metadata = { title: pageTitle("Opportunity") };

export default async function OpportunityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AppShell>
      <OpportunityDetail id={id} />
    </AppShell>
  );
}

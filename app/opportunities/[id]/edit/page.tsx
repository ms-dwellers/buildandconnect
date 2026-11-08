import type { Metadata } from "next";
import { pageTitle } from "@/lib/page-title";
import { AppShell } from "@/components/app/app-shell";
import { OpportunityScreen } from "@/components/forms/opportunity-screen";
import { routeParam } from "@/lib/navigation";

export const metadata: Metadata = { title: pageTitle("Edit opportunity") };

export default async function EditOpportunityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = routeParam((await params).id);
  return (
    <AppShell title="Edit opportunity" width="narrow">
      <OpportunityScreen id={id} />
    </AppShell>
  );
}

import type { Metadata } from "next";
import { pageTitle } from "@/lib/page-title";
import { AppShell } from "@/components/app/app-shell";
import { OpportunityScreen } from "@/components/forms/opportunity-screen";
import { pinFromParams } from "@/lib/pin-params";

export const metadata: Metadata = { title: pageTitle("Post an opportunity") };

export default async function NewOpportunityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <AppShell
      title="Post an opportunity"
      description="We analyse your description to rank developers by readiness and growth fit."
      width="narrow"
    >
      <OpportunityScreen defaultPin={pinFromParams(await searchParams)} />
    </AppShell>
  );
}

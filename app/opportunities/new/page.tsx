import { AppShell } from "@/components/app/app-shell";
import { OpportunityScreen } from "@/components/forms/opportunity-screen";
import { pinFromParams } from "@/lib/pin-params";

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

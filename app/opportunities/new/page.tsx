import { AppShell } from "@/components/app/app-shell";
import { OpportunityScreen } from "@/components/forms/opportunity-screen";
import { pinFromParams } from "@/lib/pin-params";
import { first } from "@/lib/navigation";

export default async function NewOpportunityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return (
    <AppShell
      title="Post an opportunity"
      description="We analyse your description to rank developers by readiness and growth fit."
      width="narrow"
    >
      <OpportunityScreen
        defaultPin={pinFromParams(params)}
        draftId={first(params.draft)}
      />
    </AppShell>
  );
}

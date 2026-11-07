import { AppShell } from "@/components/app/app-shell";
import { OpportunityScreen } from "@/components/forms/opportunity-screen";

export default async function EditOpportunityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AppShell title="Edit opportunity" width="narrow">
      <OpportunityScreen id={id} />
    </AppShell>
  );
}

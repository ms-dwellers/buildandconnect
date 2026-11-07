import { AppShell } from "@/components/app/app-shell";
import { RequestScreen } from "@/components/forms/request-screen";

export default async function EditRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AppShell title="Edit request" width="narrow">
      <RequestScreen id={id} />
    </AppShell>
  );
}

import { AppShell } from "@/components/app/app-shell";
import { RequestDetail } from "@/components/request-detail";

export default async function RequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AppShell title="Community project">
      <RequestDetail id={id} />
    </AppShell>
  );
}

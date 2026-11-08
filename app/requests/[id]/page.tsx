import { AppShell } from "@/components/app/app-shell";
import { RequestDetail } from "@/components/request-detail";
import { routeParam } from "@/lib/navigation";

export default async function RequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = routeParam((await params).id);
  return (
    <AppShell title="Community project">
      <RequestDetail id={id} />
    </AppShell>
  );
}

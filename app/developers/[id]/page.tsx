import { AppShell } from "@/components/app/app-shell";
import { DeveloperProfilePage } from "@/components/developer-profile";
import { routeParam } from "@/lib/navigation";

export default async function DeveloperPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = routeParam((await params).id);
  return (
    <AppShell title="Developer profile">
      <DeveloperProfilePage id={id} />
    </AppShell>
  );
}

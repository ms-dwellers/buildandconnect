import { AppShell } from "@/components/app/app-shell";
import { DeveloperProfilePage } from "@/components/developer-profile";

export default async function DeveloperPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AppShell title="Developer profile">
      <DeveloperProfilePage id={id} />
    </AppShell>
  );
}

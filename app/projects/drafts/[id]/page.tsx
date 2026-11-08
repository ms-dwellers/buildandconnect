import { AppShell } from "@/components/app/app-shell";
import { ProjectDraftEditor } from "@/components/projects/project-draft-editor";
import { routeParam } from "@/lib/navigation";

export default async function DraftPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = routeParam((await params).id);
  return (
    <AppShell title="Review your project">
      <ProjectDraftEditor id={id} />
    </AppShell>
  );
}

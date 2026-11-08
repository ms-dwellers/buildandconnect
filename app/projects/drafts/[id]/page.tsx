import { AppShell } from "@/components/app/app-shell";
import { ProjectDraftEditor } from "@/components/projects/project-draft-editor";

export default async function DraftPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AppShell title="Review your project">
      <ProjectDraftEditor id={id} />
    </AppShell>
  );
}

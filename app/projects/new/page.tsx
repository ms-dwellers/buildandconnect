import { AppShell } from "@/components/app/app-shell";
import { StartProject } from "@/components/projects/start-project";

export default function NewProjectPage() {
  return (
    <AppShell title="Start a project">
      <StartProject />
    </AppShell>
  );
}

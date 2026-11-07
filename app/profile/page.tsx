import { AppShell } from "@/components/app/app-shell";
import { ProfileEditor } from "@/components/profile-editor";

export default function ProfilePage() {
  return (
    <AppShell
      title="Your developer profile"
      description="Companies match on demonstrated skills and projects. Learning goals shape growth matching but never count against you."
      width="narrow"
    >
      <ProfileEditor />
    </AppShell>
  );
}

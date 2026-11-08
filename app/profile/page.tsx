import { AppShell } from "@/components/app/app-shell";
import { ProfileEditor } from "@/components/profile-editor";
import { safeNext } from "@/lib/navigation";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return (
    <AppShell
      title="Your developer profile"
      description="A home for your work, your next skills and feedback from the people you build with."
    >
      <ProfileEditor next={safeNext(params.next)} />
    </AppShell>
  );
}

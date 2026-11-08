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
    <AppShell title="Your developer profile" width="narrow">
      <ProfileEditor next={safeNext(params.next)} />
    </AppShell>
  );
}

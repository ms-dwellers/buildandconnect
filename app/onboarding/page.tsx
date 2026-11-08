import { AppShell } from "@/components/app/app-shell";
import { DeveloperOnboarding } from "@/components/developer-onboarding";
import { safeNext } from "@/lib/navigation";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return (
    <AppShell title="Start with what you know" width="narrow">
      <DeveloperOnboarding next={safeNext(params.next) ?? "/career"} />
    </AppShell>
  );
}

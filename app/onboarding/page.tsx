import { DeveloperOnboarding } from "@/components/developer-onboarding";
import { safeNext } from "@/lib/navigation";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return <DeveloperOnboarding next={safeNext(params.next)} />;
}

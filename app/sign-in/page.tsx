import { AppShell } from "@/components/app/app-shell";
import { AuthForm } from "@/components/app/auth-form";
import { safeNext } from "@/lib/navigation";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { next } = await searchParams;
  return (
    <AppShell title="Welcome back" width="narrow">
      <AuthForm mode="sign-in" next={safeNext(next)} />
    </AppShell>
  );
}

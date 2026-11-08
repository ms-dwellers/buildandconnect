import { AppShell } from "@/components/app/app-shell";
import { AuthForm } from "@/components/app/auth-form";
import { socialSignInError } from "@/lib/auth-errors";
import { first, safeNext } from "@/lib/navigation";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { next, error } = await searchParams;
  return (
    <AppShell
      title="Create your account"
      description="You'll choose how you want to use Build & Connect next."
      width="narrow"
    >
      <AuthForm
        mode="sign-up"
        next={safeNext(next)}
        initialError={socialSignInError(first(error))}
      />
    </AppShell>
  );
}

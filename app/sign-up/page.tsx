import type { Metadata } from "next";
import { pageTitle } from "@/lib/page-title";
import { AppShell } from "@/components/app/app-shell";
import { AuthForm } from "@/components/app/auth-form";
import { socialSignInError } from "@/lib/auth-errors";
import { first, safeNext } from "@/lib/navigation";

export const metadata: Metadata = { title: pageTitle("Create your account") };

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

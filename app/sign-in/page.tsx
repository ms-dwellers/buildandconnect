import type { Metadata } from "next";
import { pageTitle } from "@/lib/page-title";
import { AppShell } from "@/components/app/app-shell";
import { AuthForm } from "@/components/app/auth-form";
import { socialSignInError } from "@/lib/auth-errors";
import { first, safeNext } from "@/lib/navigation";

export const metadata: Metadata = { title: pageTitle("Sign in") };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { next, error } = await searchParams;
  return (
    <AppShell title="Welcome back" width="narrow">
      <AuthForm
        mode="sign-in"
        next={safeNext(next)}
        initialError={socialSignInError(first(error))}
      />
    </AppShell>
  );
}

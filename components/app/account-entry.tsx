import { AccountShell } from "./account-shell";
import { AuthForm } from "./auth-form";

export function AccountEntry({
  mode = "sign-in",
  next,
  initialError,
}: {
  mode?: "sign-in" | "sign-up";
  next: string | null;
  initialError?: string | null;
}) {
  return (
    <AccountShell
      title={mode === "sign-up" ? "Make a start" : "Welcome back"}
      description={
        mode === "sign-up"
          ? "Create an account, then choose what you’re here to do."
          : undefined
      }
    >
      <AuthForm mode={mode} next={next} initialError={initialError} />
    </AccountShell>
  );
}

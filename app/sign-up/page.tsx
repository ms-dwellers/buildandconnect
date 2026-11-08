import { AccountEntry } from "@/components/app/account-entry";
import { first, safeNext } from "@/lib/navigation";
import { socialSignInError } from "@/lib/auth-errors";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { next, error } = await searchParams;
  return (
    <AccountEntry
      mode="sign-up"
      next={safeNext(next)}
      initialError={socialSignInError(first(error))}
    />
  );
}

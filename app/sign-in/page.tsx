import { AccountEntry } from "@/components/app/account-entry";
import { safeNext } from "@/lib/navigation";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { next } = await searchParams;
  return <AccountEntry mode="sign-in" next={safeNext(next)} />;
}

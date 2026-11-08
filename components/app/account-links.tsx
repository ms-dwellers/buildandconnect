"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { homeFor, knownAccount, useSession } from "@/lib/session";

/**
 * Landing-page account links: flat links, with one primary action for guests.
 * Guest links render on the server; a remembered account replaces them on the
 * first client frame, before the live session has even loaded.
 */
export function AccountLinks() {
  const { session } = useSession();
  const account = knownAccount(session);
  if (account)
    return (
      <Button
        render={<Link href={homeFor(account.role)} />}
        variant="link"
        className="px-0"
      >
        {account.role ? "Your dashboard" : "Choose account type"}
      </Button>
    );
  return (
    <>
      <Button render={<Link href="/sign-in" />} variant="link" className="px-0">
        Sign in
      </Button>
      <Button render={<Link href="/sign-up" />} variant="highlight" size="sm">
        Get started
      </Button>
    </>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { homeFor, useSession } from "@/lib/session";

/** Landing-page account links. Guests see sign-in until the session loads. */
export function AccountLinks() {
  const { session } = useSession();
  if (session.status === "member")
    return (
      <Button
        render={<a href={homeFor(session.role)} />}
        variant="outline"
        size="sm"
      >
        {session.role ? "Your dashboard" : "Choose account type"}
      </Button>
    );
  return (
    <>
      <Button render={<a href="/sign-in" />} variant="link" className="px-0">
        Sign in
      </Button>
      <Button render={<a href="/sign-up" />} variant="highlight" size="sm">
        Get started
      </Button>
    </>
  );
}

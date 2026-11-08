"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CircleAlertIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/session";
import type { Me, Role } from "@/lib/types";
import { ROLE_LABELS } from "./app-shell";
import { withNext } from "@/lib/navigation";
import { FeedbackMascot, MascotStatus } from "@/components/mascot";

type Member = { user: Me["user"]; role: Role };

/**
 * Client-side routing only. Convex enforces every role and ownership rule, so
 * this guard exists to send people to the right place, not to protect data.
 */
export function RequireRole({
  roles,
  children,
}: {
  roles?: Role[];
  children: (member: Member) => ReactNode;
}) {
  const { session, refresh, signingOut } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (signingOut) return;
    const destination =
      pathname === "/onboarding"
        ? (new URLSearchParams(window.location.search).get("next") ?? "/career")
        : `${pathname}${window.location.search}${window.location.hash}`;
    if (session.status === "guest")
      router.replace(withNext("/sign-in", destination));
    else if (session.status === "member" && !session.role)
      router.replace(withNext("/role", destination));
  }, [session, router, pathname, signingOut]);

  if (session.status === "unavailable")
    return (
      <ErrorAlert
        title="Your account could not be loaded"
        message={session.message}
        onRetry={() => void refresh()}
      />
    );
  if (session.status !== "member" || !session.role) return <LoadingBlock />;
  if (roles && !roles.includes(session.role))
    return (
      <Alert variant="info">
        <CircleAlertIcon aria-hidden="true" />
        <AlertTitle>
          This page is for {roles.map((role) => ROLE_LABELS[role]).join(" or ")}{" "}
          accounts
        </AlertTitle>
        <AlertDescription>
          <p>Your account type is {ROLE_LABELS[session.role]}.</p>
          <Button
            render={<a href="/dashboard" />}
            variant="outline"
            size="sm"
            className="mt-2"
          >
            Go to your dashboard
          </Button>
        </AlertDescription>
      </Alert>
    );
  return <>{children({ user: session.user, role: session.role })}</>;
}

export function ErrorAlert({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <Alert variant="error" className="grid-cols-[auto_minmax(0,1fr)] gap-x-3">
      <FeedbackMascot
        state="error"
        className="row-span-2 size-11"
        replayKey={`${title}:${message}`}
      />
      <AlertTitle className="col-start-2">{title}</AlertTitle>
      <AlertDescription className="col-start-2">
        <p>{message}</p>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={onRetry}
          >
            Try again
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

export function LoadingBlock({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <MascotStatus state="loading">Loading…</MascotStatus>
      <div className="space-y-3" aria-busy="true">
        {Array.from({ length: rows }, (_, index) => (
          <Skeleton key={index} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

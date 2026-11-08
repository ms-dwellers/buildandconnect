"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CircleAlertIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MapJourneyLink } from "@/components/map/map-journey";
import { useSession } from "@/lib/session";
import type { Me, Role } from "@/lib/types";
import { ROLE_LABELS } from "./app-shell";

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
  const { session, refresh } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (session.status === "guest")
      router.replace(`/sign-in?next=${encodeURIComponent(pathname)}`);
    else if (session.status === "member" && !session.role)
      router.replace(`/role?next=${encodeURIComponent(pathname)}`);
  }, [session, router, pathname]);

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
          <p>
            You&apos;re signed in as a {ROLE_LABELS[session.role]}. Each account
            has one type, so this action isn&apos;t available from yours.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              render={<Link href="/dashboard" />}
              variant="outline"
              size="sm"
            >
              Go to your dashboard
            </Button>
            <MapJourneyLink variant="ghost" size="sm">
              Browse the map
            </MapJourneyLink>
          </div>
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
    <Alert variant="error">
      <CircleAlertIcon aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
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
    <div className="space-y-3" role="status" aria-busy="true">
      <span className="sr-only">Loading</span>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-24 w-full rounded-xl" />
      ))}
    </div>
  );
}

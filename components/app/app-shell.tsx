"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOutIcon } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { MapJourneyLink } from "@/components/map/map-journey";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/session";
import type { Role } from "@/lib/types";
import { withNext } from "@/lib/navigation";

type NavItem = { href: string; label: string };

export const ROLE_LABELS: Record<Role, string> = {
  developer: "Developer",
  requester: "Requester",
};

const NAVIGATION: Record<Role | "unassigned" | "guest", NavItem[]> = {
  guest: [{ href: "/map", label: "Map" }],
  unassigned: [
    { href: "/role", label: "Choose account type" },
    { href: "/map", label: "Map" },
  ],
  developer: [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/career", label: "Career path" },
    { href: "/map", label: "Map" },
    { href: "/profile", label: "Profile" },
  ],
  requester: [
    { href: "/dashboard", label: "My projects" },
    { href: "/map", label: "Map" },
  ],
};

export function navigationFor(role: Role | null | undefined) {
  if (role === undefined) return NAVIGATION.guest;
  return role ? NAVIGATION[role] : NAVIGATION.unassigned;
}

export function AppHeader({ className }: { className?: string }) {
  const pathname = usePathname();
  const [destination, setDestination] = useState(pathname);
  useEffect(() => {
    const current = `${pathname}${window.location.search}${window.location.hash}`;
    if (current !== destination) setDestination(current);
  });
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const { session, signOut } = useSession();
  const member = session.status === "member" ? session : null;
  const items = navigationFor(member ? member.role : undefined);
  return (
    <header
      className={cn(
        "flex min-h-18 flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b bg-card px-5 py-3 sm:px-8",
        className,
      )}
    >
      <a
        href="/"
        aria-label="Build & Connect home"
        className="flex items-center gap-2.5 text-base font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
      >
        <BrandLogo />
        Build &amp; Connect
      </a>
      <nav
        aria-label="Main"
        className="flex flex-wrap items-center gap-x-1 gap-y-2"
      >
        {items.map((item) => {
          const current =
            pathname === item.href ||
            (item.href !== "/map" && pathname.startsWith(`${item.href}/`));
          if (item.href === "/map") {
            return (
              <MapJourneyLink
                key={item.href}
                variant="ghost"
                size="sm"
                aria-current={current ? "page" : undefined}
                className="aria-[current=page]:bg-accent"
              >
                {item.label}
              </MapJourneyLink>
            );
          }
          return (
            <Button
              key={item.href}
              render={
                <a
                  href={
                    item.href === "/role"
                      ? withNext(item.href, destination)
                      : item.href
                  }
                />
              }
              variant="ghost"
              size="sm"
              aria-current={current ? "page" : undefined}
              className="aria-[current=page]:bg-accent"
            >
              {item.label}
            </Button>
          );
        })}
        {member ? (
          <span className="ms-2 flex items-center gap-3 border-s ps-3">
            <span className="text-sm leading-tight">
              <span className="block font-medium">{member.user.name}</span>
              {member.role && (
                <span className="block text-xs text-muted-foreground">
                  {ROLE_LABELS[member.role]}
                </span>
              )}
            </span>
            <Button
              variant="ghost"
              size="sm"
              loading={signingOut}
              onClick={async () => {
                setSigningOut(true);
                setSignOutError("");
                try {
                  await signOut();
                } catch {
                  setSignOutError(
                    "Sign out failed. Check your connection and retry.",
                  );
                } finally {
                  setSigningOut(false);
                }
              }}
            >
              <LogOutIcon aria-hidden="true" />
              Sign out
            </Button>
            {signOutError && (
              <span role="alert" className="max-w-52 text-xs">
                {signOutError}
              </span>
            )}
          </span>
        ) : session.status === "guest" ? (
          <span className="ms-2 flex items-center gap-2">
            <Button
              render={<a href={withNext("/sign-in", destination)} />}
              variant="ghost"
              size="sm"
            >
              Sign in
            </Button>
            <Button
              render={<a href={withNext("/sign-up", destination)} />}
              variant="outline"
              size="sm"
            >
              Get started
            </Button>
          </span>
        ) : null}
      </nav>
    </header>
  );
}

export function AppShell({
  title,
  description,
  actions,
  children,
  width = "default",
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  width?: "narrow" | "default";
}) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <a href="#main-content" className="landing-skip-link">
        Skip to content
      </a>
      <AppHeader />
      <main
        id="main-content"
        tabIndex={-1}
        className={cn(
          "mx-auto w-full flex-1 px-5 py-10 outline-none sm:px-8 sm:py-12",
          width === "narrow" ? "max-w-2xl" : "max-w-5xl",
        )}
      >
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl space-y-2">
            <h1 className="font-display text-4xl leading-tight tracking-tight">
              {title}
            </h1>
            {description && (
              <p className="text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
        {children}
      </main>
    </div>
  );
}

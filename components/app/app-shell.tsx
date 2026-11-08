"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ChevronDownIcon,
  LogOutIcon,
  MenuIcon,
  UserRoundIcon,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { MapJourneyLink } from "@/components/map/map-journey";
import { FieldMessage } from "@/components/forms/form-kit";
import { cn } from "@/lib/utils";
import { knownAccount, useSession } from "@/lib/session";
import type { Role } from "@/lib/types";
import { withNext } from "@/lib/navigation";
import { AccountLinks } from "./account-links";
import { DashboardGarden } from "@/components/dashboards/dashboard-garden";
import {
  Menu,
  MenuTrigger,
  MenuPopup,
  MenuLinkItem,
  MenuItem,
} from "@/components/ui/menu";
import {
  Dialog,
  DialogTrigger,
  DialogPopup,
  DialogHeader,
  DialogTitle,
  DialogPanel,
} from "@/components/ui/dialog";

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
    { href: "/dashboard", label: "Home" },
    { href: "/career", label: "Find projects" },
    { href: "/messages", label: "Messages" },
    { href: "/map", label: "Map" },
    { href: "/profile", label: "Profile" },
  ],
  requester: [
    { href: "/dashboard", label: "My projects" },
    { href: "/messages", label: "Messages" },
    { href: "/map", label: "Map" },
  ],
};

export function navigationFor(role: Role | null | undefined) {
  if (role === undefined) return NAVIGATION.guest;
  return role ? NAVIGATION[role] : NAVIGATION.unassigned;
}

/**
 * The one site header. The `app` variant carries the signed-in navigation,
 * `landing` is the airy home-page version with the account links, and `tool`
 * labels utility pages such as the design system and the QA console and takes
 * its own trailing actions instead of navigation.
 */
export function AppHeader({
  className,
  variant = "app",
  label,
  actions,
}: {
  className?: string;
  variant?: "app" | "landing" | "tool";
  /** A short page name shown beside the brand on tool pages. */
  label?: string;
  /** Trailing controls for tool pages, in place of the site navigation. */
  actions?: ReactNode;
}) {
  const brand = (
    <Link
      href="/"
      aria-label="Build & Connect home"
      className="flex items-center gap-2.5 text-base font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
    >
      <BrandLogo />
      <span
        className={variant === "landing" ? "hidden min-[420px]:inline" : ""}
      >
        Build &amp; Connect
      </span>
    </Link>
  );
  return (
    <header
      className={cn(
        "flex items-center justify-between gap-3",
        variant === "landing"
          ? "h-24 px-5 sm:px-10 lg:px-16"
          : "fieldbook-header min-h-18 flex-wrap gap-x-6 gap-y-2 border-b bg-card px-5 py-3 sm:px-8",
        className,
      )}
    >
      {label ? (
        <div className="flex items-center gap-3">
          {brand}
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
      ) : (
        brand
      )}
      {variant === "landing" ? (
        <nav aria-label="Main" className="flex items-center gap-3 sm:gap-6">
          <MapJourneyLink variant="link" className="hidden px-0 sm:inline-flex">
            Nearby map
          </MapJourneyLink>
          <AccountLinks />
        </nav>
      ) : variant === "tool" ? (
        actions && (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        )
      ) : (
        <SiteNavigation />
      )}
    </header>
  );
}

function SiteNavigation() {
  const pathname = usePathname();
  const [destination, setDestination] = useState(pathname);
  useEffect(() => {
    const current = `${pathname}${window.location.search}${window.location.hash}`;
    if (current !== destination) setDestination(current);
  });
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const { session, signOut } = useSession();
  const member = knownAccount(session);
  const items = navigationFor(member ? member.role : undefined);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => setMobileOpen(false), [pathname]);
  async function leave() {
    setSigningOut(true);
    setSignOutError("");
    try {
      await signOut();
      setMobileOpen(false);
    } catch {
      setSignOutError("Sign out failed. Check your connection and retry.");
    } finally {
      setSigningOut(false);
    }
  }
  function navigationLinks(mobile = false) {
    return items
      .filter((item) => mobile || item.href !== "/profile")
      .map((item) => {
        const current =
          pathname === item.href ||
          (item.href !== "/map" && pathname.startsWith(`${item.href}/`));
        const className = cn(
          "fieldbook-nav-link",
          mobile && "min-h-12 w-full justify-start px-4 text-base",
        );
        if (item.href === "/map")
          return (
            <MapJourneyLink
              key={item.href}
              variant="ghost"
              size="sm"
              aria-current={current ? "page" : undefined}
              className={className}
            >
              {item.label}
            </MapJourneyLink>
          );
        return (
          <Button
            key={item.href}
            render={
              <Link
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
            className={className}
            onClick={() => setMobileOpen(false)}
          >
            {item.label}
          </Button>
        );
      });
  }
  return (
    <div className="flex items-center gap-2 sm:gap-4">
      <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
        {navigationLinks()}
      </nav>
      {member ? (
        <div className="hidden border-s ps-4 lg:block">
          <Menu>
            <MenuTrigger
              render={<Button variant="ghost" className="h-auto gap-3 py-2" />}
              aria-label="Account menu"
            >
              <span
                aria-hidden="true"
                className="flex size-9 items-center justify-center rounded-lg bg-secondary text-sm font-semibold"
              >
                {member.user.name
                  .trim()
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join("")}
              </span>
              <span className="max-w-36 text-start text-sm">
                <span className="block truncate">{member.user.name}</span>
                <span className="block text-xs font-normal text-muted-foreground">
                  {member.role
                    ? ROLE_LABELS[member.role]
                    : "Choose account type"}
                </span>
              </span>
              <ChevronDownIcon aria-hidden="true" className="size-4" />
            </MenuTrigger>
            <MenuPopup align="end" className="w-56">
              {member.role === "developer" && (
                <MenuLinkItem render={<Link href="/profile" />}>
                  <UserRoundIcon aria-hidden="true" />
                  Your profile
                </MenuLinkItem>
              )}
              {!member.role && (
                <MenuLinkItem
                  render={<Link href={withNext("/role", destination)} />}
                >
                  Choose account type
                </MenuLinkItem>
              )}
              <MenuItem disabled={signingOut} onClick={() => void leave()}>
                <LogOutIcon aria-hidden="true" />
                {signingOut ? "Signing out…" : "Sign out"}
              </MenuItem>
            </MenuPopup>
          </Menu>
        </div>
      ) : session.status === "guest" ? (
        <span className="flex items-center gap-2">
          <Button
            render={<Link href={withNext("/sign-in", destination)} />}
            variant="ghost"
            size="sm"
          >
            Sign in
          </Button>
          <Button
            render={<Link href={withNext("/sign-up", destination)} />}
            variant="default"
            size="sm"
            className="hidden min-[420px]:inline-flex"
          >
            Get started
          </Button>
        </span>
      ) : null}
      <div className="lg:hidden">
        <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
          <DialogTrigger
            render={<Button variant="ghost" size="icon" />}
            aria-label="Open navigation"
          >
            <MenuIcon aria-hidden="true" />
          </DialogTrigger>
          <DialogPopup bottomStickOnMobile={false} className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Navigation</DialogTitle>
              {member && (
                <p className="text-sm text-muted-foreground">
                  {member.user.name}
                  {member.role && ` · ${ROLE_LABELS[member.role]}`}
                </p>
              )}
              {session.status === "guest" && (
                <Button
                  render={<Link href={withNext("/sign-up", destination)} />}
                  className="mt-4 w-full"
                >
                  Get started
                </Button>
              )}
              <FieldMessage className="mt-3 text-sm">
                {signOutError}
              </FieldMessage>
            </DialogHeader>
            <DialogPanel>
              <nav
                aria-label="Mobile"
                className="flex flex-col gap-1"
                onClick={(event) => {
                  if ((event.target as Element).closest("a"))
                    setMobileOpen(false);
                }}
              >
                {navigationLinks(true)}
              </nav>
              {member && (
                <Button
                  variant="ghost"
                  loading={signingOut}
                  onClick={() => void leave()}
                  className="mt-4 min-h-12 w-full justify-start border-t"
                >
                  <LogOutIcon aria-hidden="true" />
                  Sign out
                </Button>
              )}
            </DialogPanel>
          </DialogPopup>
        </Dialog>
      </div>
      <FieldMessage className="hidden max-w-52 text-xs lg:block">
        {signOutError}
      </FieldMessage>
    </div>
  );
}

export function AppShell({
  title,
  description,
  actions,
  children,
  width = "default",
  variant = "default",
}: {
  title?: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  width?: "narrow" | "default";
  variant?: "default" | "dashboard";
}) {
  return (
    <div
      className={cn(
        "fieldbook-surface flex min-h-svh flex-col bg-background",
        variant === "dashboard" && "dashboard-surface",
      )}
    >
      <a href="#main-content" className="landing-skip-link">
        Skip to content
      </a>
      <AppHeader />
      <main
        id="main-content"
        tabIndex={-1}
        className={cn(
          "mx-auto w-full flex-1 px-5 py-10 outline-none sm:px-8 sm:py-12",
          width === "narrow" ? "max-w-2xl" : "max-w-6xl",
        )}
      >
        {(title || description || actions) && (
          <div
            className={cn(
              "mb-8 flex justify-between gap-4",
              variant === "dashboard"
                ? "fieldbook-board items-center rounded-xl border border-primary/30 bg-secondary px-6 pt-7 pb-8 sm:px-9 sm:pt-9"
                : "flex-wrap items-end",
            )}
          >
            <div
              className={cn(
                "max-w-2xl space-y-2",
                variant === "dashboard" && "min-w-0 space-y-4",
              )}
            >
              {title && (
                <h1
                  className={cn(
                    "font-display text-4xl leading-tight tracking-tight",
                    variant === "dashboard" &&
                      "max-w-lg text-balance sm:text-5xl",
                  )}
                >
                  {title}
                </h1>
              )}
              {description && (
                <p
                  className={cn(
                    "text-sm leading-6 text-muted-foreground",
                    variant === "dashboard" && "max-w-md text-base",
                  )}
                >
                  {description}
                </p>
              )}
              {variant === "dashboard" && actions && (
                <div className="pt-2">{actions}</div>
              )}
            </div>
            {variant === "dashboard" ? (
              <DashboardGarden />
            ) : (
              actions && <div className="flex flex-wrap gap-2">{actions}</div>
            )}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}

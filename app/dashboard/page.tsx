"use client";

import { ArrowRightIcon, PlusIcon } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { RequireRole } from "@/components/app/require-role";
import { DeveloperDashboard } from "@/components/dashboards/developer-dashboard";
import { RequesterDashboard } from "@/components/dashboards/requester-dashboard";
import { Button } from "@/components/ui/button";
import { knownAccount, useSession } from "@/lib/session";
import { useApi } from "@/lib/use-api";
import { withNext } from "@/lib/navigation";
import type { OwnProfile, Role } from "@/lib/types";

const TITLES: Record<Role, string> = {
  developer: "Find your next project",
  requester: "My projects",
};

const DESCRIPTIONS: Record<Role, string> = {
  developer:
    "Build experience for your next role. Make something that matters.",
  requester: "A community need. A shared project. A place to start.",
};

const PRIMARY_ACTION: Record<Role, { href: string; label: string }> = {
  developer: { href: "/career", label: "Find projects for my goals" },
  requester: { href: "/projects/new", label: "Start a project" },
};

export default function DashboardPage() {
  const { session } = useSession();
  const role = knownAccount(session)?.role ?? null;
  const profile = useApi<OwnProfile>(
    role === "developer" && session.status === "member"
      ? "/developers/me"
      : null,
  );
  const action =
    role === "developer" && profile.error?.status === 404
      ? { href: withNext("/onboarding", "/career"), label: "Set up my profile" }
      : role
        ? PRIMARY_ACTION[role]
        : undefined;
  return (
    <AppShell
      title={role ? TITLES[role] : "Dashboard"}
      description={role ? DESCRIPTIONS[role] : undefined}
      variant="dashboard"
      actions={
        action && (
          <Button
            render={<a href={action.href} />}
            size="lg"
            className="h-auto min-h-11 whitespace-normal py-3 text-start"
          >
            {role === "requester" && <PlusIcon aria-hidden="true" />}
            {action.label}
            {role === "developer" && <ArrowRightIcon aria-hidden="true" />}
          </Button>
        )
      }
    >
      <RequireRole>
        {({ role }) =>
          role === "developer" ? (
            <DeveloperDashboard profile={profile} />
          ) : (
            <RequesterDashboard />
          )
        }
      </RequireRole>
    </AppShell>
  );
}

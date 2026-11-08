"use client";

import { PlusIcon } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { RequireRole } from "@/components/app/require-role";
import { DeveloperDashboard } from "@/components/dashboards/developer-dashboard";
import { RequesterDashboard } from "@/components/dashboards/requester-dashboard";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/session";
import type { Role } from "@/lib/types";

const TITLES: Record<Role, string> = {
  developer: "Developer dashboard",
  requester: "Requester dashboard",
};

const PRIMARY_ACTION: Partial<Record<Role, { href: string; label: string }>> = {
  requester: { href: "/projects/new", label: "Start a project" },
};

export default function DashboardPage() {
  const { session } = useSession();
  const role = session.status === "member" ? session.role : null;
  const action = role ? PRIMARY_ACTION[role] : undefined;
  return (
    <AppShell
      title={role ? TITLES[role] : "Dashboard"}
      actions={
        action && (
          <Button render={<a href={action.href} />}>
            <PlusIcon aria-hidden="true" />
            {action.label}
          </Button>
        )
      }
    >
      <RequireRole>
        {({ role }) =>
          role === "developer" ? <DeveloperDashboard /> : <RequesterDashboard />
        }
      </RequireRole>
    </AppShell>
  );
}

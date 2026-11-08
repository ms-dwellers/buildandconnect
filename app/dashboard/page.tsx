"use client";

import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { RequireRole } from "@/components/app/require-role";
import { CompanyDashboard } from "@/components/dashboards/company-dashboard";
import { DeveloperDashboard } from "@/components/dashboards/developer-dashboard";
import { RecruiterDashboard } from "@/components/dashboards/recruiter-dashboard";
import { RequesterDashboard } from "@/components/dashboards/requester-dashboard";
import { Button } from "@/components/ui/button";
import { knownAccount, useSession } from "@/lib/session";
import type { Role } from "@/lib/types";

const TITLES: Record<Role, string> = {
  developer: "Developer dashboard",
  requester: "Requester dashboard",
  company: "Company dashboard",
  recruiter: "Recruiter dashboard",
};

const PRIMARY_ACTION: Partial<Record<Role, { href: string; label: string }>> = {
  requester: { href: "/requests/new", label: "Post a request" },
  company: { href: "/opportunities/new", label: "Post an opportunity" },
};

export default function DashboardPage() {
  const { session } = useSession();
  // The remembered role keeps the title and primary action stable while the
  // live session loads.
  const role = knownAccount(session)?.role ?? null;
  const action = role ? PRIMARY_ACTION[role] : undefined;
  return (
    <AppShell
      title={role ? TITLES[role] : "Dashboard"}
      actions={
        action && (
          <Button render={<Link href={action.href} />}>
            <PlusIcon aria-hidden="true" />
            {action.label}
          </Button>
        )
      }
    >
      <RequireRole>
        {({ role }) =>
          role === "developer" ? (
            <DeveloperDashboard />
          ) : role === "requester" ? (
            <RequesterDashboard />
          ) : role === "company" ? (
            <CompanyDashboard />
          ) : (
            <RecruiterDashboard />
          )
        }
      </RequireRole>
    </AppShell>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BriefcaseBusinessIcon,
  CodeXmlIcon,
  HeartHandshakeIcon,
  SearchIcon,
  type LucideIcon,
} from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { ErrorAlert, LoadingBlock } from "@/components/app/require-role";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import type { Role } from "@/lib/types";

const CHOICES: {
  role: Role;
  label: string;
  description: string;
  icon: LucideIcon;
  next: string;
}[] = [
  {
    role: "developer",
    label: "Developer",
    description:
      "Build a profile, set your area, and take on nearby projects that grow your skills.",
    icon: CodeXmlIcon,
    next: "/profile",
  },
  {
    role: "requester",
    label: "Requester",
    description:
      "Post a local problem on the map and find a developer nearby to help.",
    icon: HeartHandshakeIcon,
    next: "/dashboard",
  },
  {
    role: "company",
    label: "Company",
    description:
      "Post paid or volunteer opportunities and review developers ranked by growth fit.",
    icon: BriefcaseBusinessIcon,
    next: "/dashboard",
  },
  {
    role: "recruiter",
    label: "Recruiter",
    description:
      "Browse developers who have chosen to be discoverable, with their project evidence.",
    icon: SearchIcon,
    next: "/dashboard",
  },
];

export default function RolePage() {
  const router = useRouter();
  const { session, refresh } = useSession();
  const [pending, setPending] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);

  // While a choice is saving, choose() decides where to go next. Without this,
  // the refreshed session would trigger the "already chosen" redirect first.
  const choosing = useRef(false);

  useEffect(() => {
    if (choosing.current) return;
    if (session.status === "guest") router.replace("/sign-in?next=/role");
    if (session.status === "member" && session.role)
      router.replace("/dashboard");
  }, [session, router]);

  async function choose(role: Role, next: string) {
    choosing.current = true;
    setPending(role);
    setError(null);
    const result = await api("/me/role", {
      method: "PUT",
      body: JSON.stringify({ role }),
    });
    await refresh();
    if (!result.ok && result.status !== 409) {
      choosing.current = false;
      setPending(null);
      setError(result.error);
      return;
    }
    router.push(result.ok ? next : "/dashboard");
  }

  return (
    <AppShell
      title="How will you use Build & Connect?"
      description="This sets what you can do in the app. It can't be changed later."
    >
      {session.status === "unavailable" ? (
        <ErrorAlert
          title="Your account could not be loaded"
          message={session.message}
          onRetry={() => void refresh()}
        />
      ) : session.status !== "member" || session.role ? (
        <LoadingBlock rows={2} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {CHOICES.map(({ role, label, description, icon: Icon, next }) => (
            <button
              key={role}
              type="button"
              disabled={pending !== null}
              onClick={() => void choose(role, next)}
              className="group flex flex-col items-start gap-4 rounded-xl border bg-card p-6 text-start shadow-sm/5 transition-[border-color,box-shadow] hover:border-primary/50 hover:shadow-md/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-64 aria-busy:border-primary"
              aria-busy={pending === role || undefined}
            >
              <span className="flex size-11 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <span className="space-y-1.5">
                <span className="block text-lg font-semibold">{label}</span>
                <span className="block text-sm leading-6 text-muted-foreground">
                  {description}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
      {error && (
        <div className="mt-6">
          <ErrorAlert title="Account type not saved" message={error} />
        </div>
      )}
    </AppShell>
  );
}

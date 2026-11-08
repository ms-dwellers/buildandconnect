"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CodeXmlIcon, HeartHandshakeIcon, type LucideIcon } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { ErrorAlert, LoadingBlock } from "@/components/app/require-role";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";
import type { Role } from "@/lib/types";
import {
  afterAuthentication,
  afterRoleSelection,
  withNext,
} from "@/lib/navigation";

const CHOICES: {
  role: Role;
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    role: "developer",
    label: "Developer",
    description:
      "Add your skills and find projects that help you build experience.",
    icon: CodeXmlIcon,
  },
  {
    role: "requester",
    label: "Requester",
    description:
      "Describe a project or post a local request and find a developer to help.",
    icon: HeartHandshakeIcon,
  },
];

export function RoleChooser({ next }: { next: string | null }) {
  const router = useRouter();
  const { session, refresh, signingOut } = useSession();
  const neededRole =
    next && /^\/(?:projects|voice|hire|requests\/new)(?:\/|\?|#|$)/.test(next)
      ? "Requester"
      : next && /^\/(?:career|profile)(?:\/|\?|#|$)/.test(next)
        ? "Developer"
        : null;
  const [pending, setPending] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);

  // While a choice is saving, choose() decides where to go next. Without this,
  // the refreshed session would trigger the "already chosen" redirect first.
  const choosing = useRef(false);

  useEffect(() => {
    if (choosing.current || signingOut) return;
    if (session.status === "guest") router.replace(withNext("/sign-in", next));
    if (session.status === "member" && session.role)
      router.replace(afterAuthentication(session.role, next));
  }, [session, router, next, signingOut]);

  async function choose(role: Role) {
    if (choosing.current) return;
    let navigating = false;
    choosing.current = true;
    setPending(role);
    setError(null);
    try {
      const result = await api("/me/role", {
        method: "PUT",
        body: JSON.stringify({ role }),
      });
      const updated = await refresh();
      if (!result.ok && result.status !== 409) {
        choosing.current = false;
        setPending(null);
        setError(result.error);
        return;
      }
      if (updated.status !== "member" || !updated.role) {
        setError(
          "Your account type could not be confirmed. Retry when your connection is restored.",
        );
        return;
      }
      router.replace(afterRoleSelection(updated.role, next));
      navigating = true;
    } catch {
      setError(
        "Your account type could not be saved. Check your connection and try again.",
      );
    } finally {
      if (!navigating) choosing.current = false;
      setPending(null);
    }
  }

  return (
    <AppShell
      title="How will you use Build & Connect?"
      description="This sets what you can do in the app. It can't be changed later."
    >
      {neededRole && (
        <p className="mb-5 text-sm">
          Choose {neededRole} to continue with the action you started.
        </p>
      )}
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
          {CHOICES.map(({ role, label, description, icon: Icon }) => (
            <button
              key={role}
              type="button"
              disabled={pending !== null}
              onClick={() => void choose(role)}
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

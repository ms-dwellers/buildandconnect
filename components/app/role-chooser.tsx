"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CodeXmlIcon, HeartHandshakeIcon, type LucideIcon } from "lucide-react";
import { AccountShell } from "@/components/app/account-shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Radio, RadioGroup } from "@/components/ui/radio-group";
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
  const [selected, setSelected] = useState<Role | null>(null);
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
    <AccountShell title="How will you use Build & Connect?">
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
        <div className="space-y-5">
          <RadioGroup
            value={selected ?? ""}
            aria-label="Account type"
            disabled={pending !== null}
            onValueChange={(value) => {
              setSelected(value as Role);
              setError(null);
            }}
            className="gap-4"
          >
            {CHOICES.map(({ role, label, description, icon: Icon }) => (
              <Label
                key={role}
                htmlFor={`account-${role}`}
                className="flex cursor-pointer items-start gap-4 rounded-2xl border bg-card p-5 font-sans shadow-card has-data-checked:border-primary has-data-checked:bg-secondary/40"
              >
                <span className="flex size-11 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <span className="flex-1 space-y-1.5">
                  <span className="block text-lg font-semibold">{label}</span>
                  <span className="block text-sm font-normal leading-6 text-muted-foreground">
                    {description}
                  </span>
                </span>
                <Radio id={`account-${role}`} value={role} className="mt-2" />
              </Label>
            ))}
          </RadioGroup>
          <p className="text-sm leading-6 text-muted-foreground">
            This sets what you can do in the app. It can’t be changed later.
          </p>
          <Button
            className="w-full"
            loading={pending !== null}
            onClick={() =>
              selected
                ? void choose(selected)
                : setError("Choose Developer or Requester to continue.")
            }
          >
            {selected
              ? `Continue as ${selected === "developer" ? "Developer" : "Requester"}`
              : "Continue"}
          </Button>
        </div>
      )}
      {error && (
        <div className="mt-6">
          <ErrorAlert title="Account type not saved" message={error} />
        </div>
      )}
    </AccountShell>
  );
}

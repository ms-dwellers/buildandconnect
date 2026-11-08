"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CodeXmlIcon, HeartHandshakeIcon, type LucideIcon } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { ErrorAlert, LoadingBlock } from "@/components/app/require-role";
import { Button } from "@/components/ui/button";
import { Card, CardPanel } from "@/components/ui/card";
import { api } from "@/lib/api";
import { safeNext } from "@/lib/navigation";
import { useSession } from "@/lib/session";
import type { Role } from "@/lib/types";

type Choice = {
  role: Role;
  label: string;
  description: string;
  can: string[];
  icon: LucideIcon;
  next: string;
};

const CHOICES: Choice[] = [
  {
    role: "developer",
    label: "Developer",
    description:
      "Build a profile, set your area, and take on nearby projects that grow your skills.",
    can: [
      "Create a profile with your skills, projects, and interests",
      "See nearby requests and opportunities ranked for you",
      "Accept a request or show interest in an opportunity",
    ],
    icon: CodeXmlIcon,
    next: "/profile",
  },
  {
    role: "requester",
    label: "Requester",
    description:
      "Describe a project or post a local request and find a developer to help.",
    can: [
      "Post community requests with a map pin",
      "Describe a project by voice and post it as an opportunity",
      "See ranked matches, express interest, and connect when it is mutual",
    ],
    icon: HeartHandshakeIcon,
    next: "/dashboard",
  },
];

export default function RolePage() {
  return (
    <Suspense
      fallback={
        <AppShell
          title="How will you use Build & Connect?"
          description="Pick the account type that fits you, then confirm. It can't be changed later."
        >
          <LoadingBlock rows={2} />
        </AppShell>
      }
    >
      <RoleChooser />
    </Suspense>
  );
}

function RoleChooser() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next") ?? undefined);
  const { session, refresh } = useSession();
  const [selected, setSelected] = useState<Role | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const choice = CHOICES.find((entry) => entry.role === selected) ?? null;
  const here = next ? `/role?next=${encodeURIComponent(next)}` : "/role";

  // While a choice is saving, confirm() decides where to go next. Without this,
  // the refreshed session would trigger the "already chosen" redirect first.
  const choosing = useRef(false);

  useEffect(() => {
    if (choosing.current) return;
    if (session.status === "guest")
      router.replace(`/sign-in?next=${encodeURIComponent(here)}`);
    if (session.status === "member" && session.role)
      router.replace(next ?? "/dashboard");
  }, [session, router, next, here]);

  async function confirm(entry: Choice) {
    choosing.current = true;
    setPending(true);
    setError(null);
    const result = await api("/me/role", {
      method: "PUT",
      body: JSON.stringify({ role: entry.role }),
    });
    await refresh();
    if (!result.ok && result.status !== 409) {
      choosing.current = false;
      setPending(false);
      setError(result.error);
      return;
    }
    router.push(next ?? (result.ok ? entry.next : "/dashboard"));
  }

  return (
    <AppShell
      title="How will you use Build & Connect?"
      description="Pick the account type that fits you, then confirm. It can't be changed later."
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
        <>
          <div
            className="grid gap-4 sm:grid-cols-2"
            role="group"
            aria-label="Account types"
          >
            {CHOICES.map((entry) => {
              const Icon = entry.icon;
              const active = selected === entry.role;
              return (
                <Card
                  key={entry.role}
                  className={active ? "border-primary ring-2 ring-ring/25" : ""}
                >
                  <button
                    type="button"
                    aria-pressed={active}
                    disabled={pending}
                    onClick={() => setSelected(entry.role)}
                    className="flex w-full flex-col items-start gap-4 rounded-[inherit] p-6 text-start outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-64"
                  >
                    <span className="flex size-11 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                    <span className="space-y-1.5">
                      <span className="block text-lg font-semibold">
                        {entry.label}
                      </span>
                      <span className="block text-sm leading-6 text-muted-foreground">
                        {entry.description}
                      </span>
                    </span>
                  </button>
                </Card>
              );
            })}
          </div>
          {choice && (
            <Card className="mt-6 border-primary/30 bg-secondary/30">
              <CardPanel className="space-y-4 p-6">
                <div>
                  <h2 className="text-lg font-semibold">
                    Continue as a {choice.label}?
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    This choice is permanent for this account. As a{" "}
                    {choice.label} you can:
                  </p>
                </div>
                <ul className="list-disc space-y-1 ps-5 text-sm leading-6">
                  {choice.can.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => void confirm(choice)}
                    loading={pending}
                  >
                    Continue as a {choice.label}
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={pending}
                    onClick={() => setSelected(null)}
                  >
                    Choose a different type
                  </Button>
                </div>
              </CardPanel>
            </Card>
          )}
        </>
      )}
      {error && (
        <div className="mt-6">
          <ErrorAlert title="Account type not saved" message={error} />
        </div>
      )}
    </AppShell>
  );
}

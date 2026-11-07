"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SiteShell } from "../../components/SiteShell.tsx";
import { api, type Role } from "../../lib/api.ts";

const choices: {
  role: Role;
  label: string;
  description: string;
  href: string;
}[] = [
  {
    role: "requester",
    label: "Requester",
    description: "Post a local problem and find a nearby developer.",
    href: "/requests/new",
  },
  {
    role: "developer",
    label: "Developer",
    description: "Set your pin and accept nearby requests on the map.",
    href: "/map",
  },
  {
    role: "company",
    label: "Company",
    description: "Post structured opportunities for growth matching.",
    href: "/",
  },
  {
    role: "recruiter",
    label: "Recruiter",
    description: "Browse consented developer profiles.",
    href: "/",
  },
];

export default function RolePage() {
  const router = useRouter();
  const [current, setCurrent] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Role | null>(null);

  useEffect(() => {
    void api<{ role: Role | null }>("/me").then((result) => {
      if (result.ok) setCurrent(result.data.role);
      else if (result.status === 401) router.push("/sign-in");
    });
  }, [router]);

  async function choose(role: Role, href: string) {
    setPending(role);
    setError(null);
    const result = await api<{ role: Role }>("/me/role", {
      method: "PUT",
      body: JSON.stringify({ role }),
    });
    setPending(null);
    if (!result.ok) {
      setError(result.error);
      if (result.status === 409) router.push(href);
      return;
    }
    router.push(href);
  }

  return (
    <SiteShell title="Choose how you use Build & Connect">
      {current ? (
        <p className="mb-4 text-sm text-stone-700">
          Your account role is already set to <strong>{current}</strong>.
        </p>
      ) : null}
      <div className="grid gap-4">
        {choices.map((choice) => (
          <button
            key={choice.role}
            type="button"
            disabled={pending !== null || current !== null}
            onClick={() => void choose(choice.role, choice.href)}
            className="rounded-2xl border border-stone-200 bg-white p-5 text-left hover:border-emerald-700 disabled:opacity-60"
          >
            <p className="font-semibold">{choice.label}</p>
            <p className="mt-1 text-sm text-stone-700">{choice.description}</p>
          </button>
        ))}
      </div>
      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
    </SiteShell>
  );
}

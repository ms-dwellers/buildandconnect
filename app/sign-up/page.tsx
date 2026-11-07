"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SiteShell } from "../../components/SiteShell.tsx";
import { api } from "../../lib/api.ts";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await api("/auth/sign-up/email", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push("/role");
  }

  return (
    <SiteShell title="Create an account">
      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-2xl border border-stone-200 bg-white p-6"
      >
        <label className="block text-sm">
          Name
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          Email
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          Password
          <input
            required
            type="password"
            minLength={12}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2"
          />
        </label>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-emerald-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "Creating…" : "Sign up"}
        </button>
      </form>
    </SiteShell>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPinPicker, type Pin } from "../../../components/MapPinPicker.tsx";
import { SiteShell } from "../../../components/SiteShell.tsx";
import { api } from "../../../lib/api.ts";

export default function NewRequestPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pin, setPin] = useState<Pin | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!pin) {
      setError("Drop a pin for where help is needed.");
      return;
    }
    setPending(true);
    setError(null);
    const result = await api("/requests", {
      method: "POST",
      body: JSON.stringify({
        title,
        description,
        place: pin.place,
        latitude: pin.latitude,
        longitude: pin.longitude,
      }),
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push("/requests");
  }

  return (
    <SiteShell title="Post a local request">
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block text-sm">
          Title
          <input
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          Description
          <textarea
            required
            minLength={30}
            rows={6}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2"
          />
        </label>
        <MapPinPicker value={pin} onChange={setPin} />
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-emerald-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "Posting…" : "Post request"}
        </button>
      </form>
    </SiteShell>
  );
}

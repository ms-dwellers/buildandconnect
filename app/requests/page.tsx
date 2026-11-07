"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteShell } from "../../components/SiteShell.tsx";
import { api } from "../../lib/api.ts";

type OwnedRequest = {
  id: string;
  title: string;
  place: string;
  status: "open" | "claimed" | "closed";
  claimantName: string | null;
};

export default function RequestsPage() {
  const [requests, setRequests] = useState<OwnedRequest[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const result = await api<{ data: OwnedRequest[] }>("/requests");
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setRequests(result.data.data);
  }

  useEffect(() => {
    void load();
  }, []);

  async function closeRequest(id: string) {
    const result = await api(`/requests/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "closed" }),
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    await load();
  }

  async function releaseRequest(id: string) {
    const result = await api(`/requests/${id}/release`, { method: "POST" });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    await load();
  }

  return (
    <SiteShell title="Your requests">
      <div className="mb-4">
        <Link
          href="/requests/new"
          className="rounded-xl bg-emerald-800 px-4 py-2 text-sm font-medium text-white"
        >
          Post another request
        </Link>
      </div>
      {error ? <p className="mb-4 text-sm text-red-700">{error}</p> : null}
      <ul className="space-y-3">
        {requests.map((request) => (
          <li
            key={request.id}
            className="rounded-2xl border border-stone-200 bg-white p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{request.title}</p>
                <p className="mt-1 text-sm text-stone-700">{request.place}</p>
                <p className="mt-2 text-sm capitalize text-stone-600">
                  {request.status}
                  {request.claimantName
                    ? ` · accepted by ${request.claimantName}`
                    : ""}
                </p>
              </div>
              <div className="flex gap-2">
                {request.status === "claimed" ? (
                  <button
                    type="button"
                    onClick={() => void releaseRequest(request.id)}
                    className="rounded-xl border border-stone-300 px-3 py-1.5 text-sm"
                  >
                    Release
                  </button>
                ) : null}
                {request.status !== "closed" ? (
                  <button
                    type="button"
                    onClick={() => void closeRequest(request.id)}
                    className="rounded-xl border border-stone-300 px-3 py-1.5 text-sm"
                  >
                    Close
                  </button>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
      {!requests.length && !error ? (
        <p className="text-sm text-stone-700">No requests yet.</p>
      ) : null}
    </SiteShell>
  );
}

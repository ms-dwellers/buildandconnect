"use client";

import { useCallback, useEffect, useState } from "react";
import { MapPinPicker, type Pin } from "../../components/MapPinPicker.tsx";
import {
  NearbyRequestsMap,
  type NearbyRequest,
} from "../../components/NearbyRequestsMap.tsx";
import { SiteShell } from "../../components/SiteShell.tsx";
import { api } from "../../lib/api.ts";

type OwnDeveloper = {
  location: { latitude: number; longitude: number; radiusKm: number } | null;
};

const starterProfile = {
  bio: "Early-career developer looking for nearby community projects.",
  city: "Local",
  skills: [{ name: "react", level: 3 }],
  projects: [
    {
      title: "Starter project",
      description: "A portfolio project showing front-end fundamentals.",
      technologies: ["react"],
    },
  ],
  interests: ["community"],
  wantsToLearn: ["typescript"],
  experienceLevel: 2,
  collaboration: "flexible",
  weeklyHours: 10,
  acceptsVolunteer: true,
  available: true,
  discoverable: true,
};

export default function MapPage() {
  const [pin, setPin] = useState<Pin | null>(null);
  const [radiusKm, setRadiusKm] = useState(25);
  const [requests, setRequests] = useState<NearbyRequest[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const selected = requests.find((request) => request.requestId === selectedId);

  const refreshNearby = useCallback(async () => {
    const result = await api<{ data: NearbyRequest[] }>("/requests/nearby");
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    setRequests(result.data.data);
  }, []);

  useEffect(() => {
    void (async () => {
      const me = await api<OwnDeveloper>("/developers/me");
      if (me.ok) {
        if (me.data.location) {
          setPin({
            latitude: me.data.location.latitude,
            longitude: me.data.location.longitude,
            place: "Your saved pin",
          });
          setRadiusKm(me.data.location.radiusKm);
          setReady(true);
          await refreshNearby();
        }
        return;
      }
      if (me.status === 404) {
        const created = await api("/developers/me", {
          method: "PUT",
          body: JSON.stringify(starterProfile),
        });
        if (!created.ok) setError(created.error);
      } else if (me.status === 401) {
        setError("Sign in as a developer to use the nearby map.");
      } else {
        setError(me.error);
      }
    })();
  }, [refreshNearby]);

  async function saveLocation() {
    if (!pin) {
      setError("Drop a pin for your working area.");
      return;
    }
    setMessage(null);
    const result = await api("/developers/me/location", {
      method: "PATCH",
      body: JSON.stringify({
        latitude: pin.latitude,
        longitude: pin.longitude,
        radiusKm,
      }),
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setReady(true);
    setMessage("Location saved.");
    await refreshNearby();
  }

  async function acceptSelected() {
    if (!selectedId) return;
    const result = await api(`/requests/${selectedId}/accept`, {
      method: "POST",
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setMessage("Request accepted.");
    setSelectedId(null);
    await refreshNearby();
  }

  return (
    <SiteShell title="Nearby requests">
      <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="text-lg font-semibold">Your pin and radius</h2>
        <MapPinPicker value={pin} onChange={setPin} radiusKm={radiusKm} />
        <label className="block text-sm">
          Radius: {radiusKm} km
          <input
            type="range"
            min={1}
            max={100}
            value={radiusKm}
            onChange={(event) => setRadiusKm(Number(event.target.value))}
            className="mt-2 w-full"
          />
        </label>
        <button
          type="button"
          onClick={() => void saveLocation()}
          className="rounded-xl bg-emerald-800 px-4 py-2 text-sm font-medium text-white"
        >
          Save location
        </button>
      </section>

      {ready && pin ? (
        <section className="mt-8 space-y-4">
          <NearbyRequestsMap
            center={pin}
            requests={requests}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
          <ul className="space-y-3">
            {requests.map((request) => (
              <li key={request.requestId}>
                <button
                  type="button"
                  onClick={() => setSelectedId(request.requestId)}
                  className={`w-full rounded-2xl border p-4 text-left ${
                    selectedId === request.requestId
                      ? "border-emerald-700 bg-emerald-50"
                      : "border-stone-200 bg-white"
                  }`}
                >
                  <p className="font-semibold">{request.title}</p>
                  <p className="mt-1 text-sm text-stone-700">
                    {request.place} · {request.distanceKm} km · {request.score}%
                    match
                  </p>
                </button>
              </li>
            ))}
          </ul>
          {selected ? (
            <div className="rounded-2xl border border-stone-200 bg-white p-5">
              <p className="font-semibold">{selected.title}</p>
              <p className="mt-2 text-sm text-stone-700">
                {selected.distanceKm} km away · growth score {selected.score}%
              </p>
              <button
                type="button"
                onClick={() => void acceptSelected()}
                className="mt-4 rounded-xl bg-emerald-800 px-4 py-2 text-sm font-medium text-white"
              >
                Accept this request
              </button>
            </div>
          ) : null}
          {!requests.length ? (
            <p className="text-sm text-stone-700">
              No open requests in your radius yet.
            </p>
          ) : null}
        </section>
      ) : null}

      {message ? (
        <p className="mt-4 text-sm text-emerald-800">{message}</p>
      ) : null}
      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
    </SiteShell>
  );
}

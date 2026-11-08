"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api } from "./api.ts";
import type { Me, Role } from "./types.ts";

export type Session =
  | { status: "loading" }
  /** An account this browser remembers, shown while the real session loads. */
  | { status: "resuming"; user: { name: string }; role: Role | null }
  | { status: "guest" }
  | { status: "unavailable"; message: string }
  | { status: "member"; user: Me["user"]; role: Role | null };

type SessionContext = {
  session: Session;
  refresh: () => Promise<Session>;
  signOut: () => Promise<void>;
};

const Context = createContext<SessionContext | null>(null);
const MEMORY_KEY = "bandc.session";
const ROLES: Role[] = ["developer", "company", "recruiter", "requester"];

type Remembered = { name: string; role: Role | null };

/** Only a display name and role are remembered; nothing that grants access. */
function remember(value: Remembered | null) {
  try {
    if (value) window.localStorage.setItem(MEMORY_KEY, JSON.stringify(value));
    else window.localStorage.removeItem(MEMORY_KEY);
  } catch {
    // Storage can be unavailable; the live session still loads.
  }
}

function recall(): Remembered | null {
  try {
    const raw = window.localStorage.getItem(MEMORY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Remembered>;
    if (typeof parsed.name !== "string") return null;
    const role = ROLES.find((candidate) => candidate === parsed.role) ?? null;
    return { name: parsed.name, role };
  } catch {
    return null;
  }
}

async function loadSession(): Promise<Session> {
  const result = await api<Me>("/me");
  if (result.ok) {
    remember({ name: result.data.user.name, role: result.data.role });
    return { status: "member", user: result.data.user, role: result.data.role };
  }
  if (result.status === 401) {
    remember(null);
    return { status: "guest" };
  }
  return { status: "unavailable", message: result.error };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>({ status: "loading" });
  const refresh = useCallback(async () => {
    const next = await loadSession();
    setSession(next);
    return next;
  }, []);
  const signOut = useCallback(async () => {
    await api("/auth/sign-out", { method: "POST", body: "{}" });
    remember(null);
    setSession({ status: "guest" });
  }, []);
  useEffect(() => {
    // Show the remembered account at once so the chrome does not flicker from
    // guest to member, then confirm it against the real session.
    const remembered = recall();
    if (remembered)
      setSession((current) =>
        current.status === "loading"
          ? {
              status: "resuming",
              user: { name: remembered.name },
              role: remembered.role,
            }
          : current,
      );
    void refresh();
  }, [refresh]);
  return (
    <Context.Provider value={{ session, refresh, signOut }}>
      {children}
    </Context.Provider>
  );
}

export function useSession() {
  const value = useContext(Context);
  if (!value) throw new Error("useSession requires SessionProvider");
  return value;
}

/** Where each account type starts after signing in. */
export function homeFor(role: Role | null) {
  return role ? "/dashboard" : "/role";
}

/** The account the chrome should assume right now, remembered or confirmed. */
export function knownAccount(session: Session) {
  return session.status === "member" || session.status === "resuming"
    ? session
    : null;
}

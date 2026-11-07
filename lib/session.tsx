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
  | { status: "guest" }
  | { status: "unavailable"; message: string }
  | { status: "member"; user: Me["user"]; role: Role | null };

type SessionContext = {
  session: Session;
  refresh: () => Promise<Session>;
  signOut: () => Promise<void>;
};

const Context = createContext<SessionContext | null>(null);

async function loadSession(): Promise<Session> {
  const result = await api<Me>("/me");
  if (result.ok)
    return { status: "member", user: result.data.user, role: result.data.role };
  if (result.status === 401) return { status: "guest" };
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
    setSession({ status: "guest" });
  }, []);
  useEffect(() => {
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

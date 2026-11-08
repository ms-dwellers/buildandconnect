"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import { api } from "./api.ts";
import type { Me, Role } from "./types.ts";
import { usePathname, useRouter } from "next/navigation";

export type Session =
  | { status: "loading" }
  | { status: "guest" }
  | { status: "unavailable"; message: string }
  | { status: "member"; user: Me["user"]; role: Role | null };

type SessionContext = {
  session: Session;
  refresh: () => Promise<Session>;
  signOut: () => Promise<void>;
  signingOut: boolean;
};

const Context = createContext<SessionContext | null>(null);

async function loadSession(): Promise<Session> {
  try {
    const result = await api<Me>("/me");
    if (result.ok)
      return {
        status: "member",
        user: result.data.user,
        role: result.data.role,
      };
    if (result.status === 401) return { status: "guest" };
    return { status: "unavailable", message: result.error };
  } catch {
    return {
      status: "unavailable",
      message:
        "Your account could not be loaded. Check your connection and retry.",
    };
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>({ status: "loading" });
  const [signingOut, setSigningOut] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const attempt = ++generation.current;
    const next = await loadSession();
    if (attempt === generation.current) setSession(next);
    return next;
  }, []);
  const signOut = useCallback(async () => {
    setSigningOut(true);
    generation.current++;
    try {
      const response = await api("/auth/sign-out", {
        method: "POST",
        body: "{}",
      });
      if (!response.ok) throw new Error(response.error);
      generation.current++;
      setSession({ status: "guest" });
      router.replace("/");
    } catch (error) {
      setSigningOut(false);
      throw error;
    }
  }, [router]);
  useEffect(() => {
    if (pathname === "/") setSigningOut(false);
  }, [pathname]);
  useEffect(() => {
    void refresh();
    return () => {
      generation.current++;
    };
  }, [refresh]);
  return (
    <Context.Provider value={{ session, refresh, signOut, signingOut }}>
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

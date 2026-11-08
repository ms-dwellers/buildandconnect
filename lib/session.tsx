"use client";

import {
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
import { sessionContext as Context, type Session } from "./session-context";
export type { Session } from "./session-context";
const MEMORY_KEY = "bandc.session";
const ROLES: Role[] = ["developer", "requester"];

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
  try {
    // Better Auth answers 200 with null for guests, so the common signed-out
    // case never logs a failed request in the browser console.
    const probe = await api<unknown>("/auth/get-session");
    if (probe.ok && probe.data === null) {
      remember(null);
      return { status: "guest" };
    }
    const result = await api<Me>("/me");
    if (result.ok) {
      remember({ name: result.data.user.name, role: result.data.role });
      return {
        status: "member",
        user: result.data.user,
        role: result.data.role,
      };
    }
    if (result.status === 401) {
      remember(null);
      return { status: "guest" };
    }
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
      remember(null);
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

/** The account the chrome should assume right now, remembered or confirmed. */
export function knownAccount(session: Session) {
  return session.status === "member" || session.status === "resuming"
    ? session
    : null;
}

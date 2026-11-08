"use client";

import { createContext } from "react";
import type { Me, Role } from "./types";

export type Session =
  | { status: "loading" }
  | { status: "resuming"; user: { name: string }; role: Role | null }
  | { status: "guest" }
  | { status: "unavailable"; message: string }
  | { status: "member"; user: Me["user"]; role: Role | null };

type SessionContext = {
  session: Session;
  refresh: () => Promise<Session>;
  signOut: () => Promise<void>;
  signingOut: boolean;
};

// Keep context identity independent of hot-reloaded provider components.
export const sessionContext = createContext<SessionContext | null>(null);

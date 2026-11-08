"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import {
  confirmedBriefSchema,
  type HiringBrief,
} from "@/backend/hiring/schemas";
import { useSession } from "./session";

type Draft = { id: string; ownerId: string; brief: HiringBrief };
type DraftContext = {
  stage: (brief: HiringBrief) => string;
  read: (id: string) => HiringBrief | undefined;
  clear: (id: string) => void;
};
const Context = createContext<DraftContext | null>(null);

/** One in-memory, account-scoped handoff. No brief content goes into the URL. */
export function OpportunityDraftProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { session } = useSession();
  const ownerId =
    session.status === "member" && session.role === "requester"
      ? session.user.id
      : null;
  const draft = useRef<Draft | null>(null);
  useEffect(() => {
    if (draft.current?.ownerId !== ownerId) draft.current = null;
  }, [ownerId]);
  const value: DraftContext = {
    stage(brief) {
      if (!ownerId) throw new Error("Sign in as a requester to continue.");
      const validated = confirmedBriefSchema.parse({ brief }).brief;
      const id = crypto.randomUUID();
      draft.current = { id, ownerId, brief: validated };
      return id;
    },
    read(id) {
      return draft.current?.id === id && draft.current.ownerId === ownerId
        ? draft.current.brief
        : undefined;
    },
    clear(id) {
      if (draft.current?.id === id && draft.current.ownerId === ownerId)
        draft.current = null;
    },
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useOpportunityDraft() {
  const value = useContext(Context);
  if (!value)
    throw new Error("useOpportunityDraft requires OpportunityDraftProvider");
  return value;
}

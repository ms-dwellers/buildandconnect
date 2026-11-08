"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type {
  ProjectDraftContent,
  ProjectDraftRecord,
} from "@/backend/project-drafts";

export function useDraftSave(initial: ProjectDraftRecord) {
  const saved = useRef(initial);
  const content = useRef(initial.content);
  const dirty = useRef(false);
  const conflicted = useRef(false);
  const flight = useRef<Promise<boolean> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const request = useRef<AbortController | null>(null);
  const [status, setStatus] = useState("Saved privately");
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);

  const flush = useCallback((): Promise<boolean> => {
    if (timer.current) clearTimeout(timer.current);
    if (flight.current) return flight.current;
    if (conflicted.current) return Promise.resolve(false);
    const save = async () => {
      while (
        JSON.stringify(saved.current.content) !==
        JSON.stringify(content.current)
      ) {
        const snapshot = content.current;
        const controller = new AbortController();
        request.current = controller;
        setStatus("Saving privately…");
        setError("");
        try {
          const response = await api<ProjectDraftRecord>(
            `/project-drafts/${encodeURIComponent(initial.id)}`,
            {
              method: "PUT",
              body: JSON.stringify({
                content: snapshot,
                expectedUpdatedAt: saved.current.updatedAt,
              }),
              signal: AbortSignal.any([
                controller.signal,
                AbortSignal.timeout(20_000),
              ]),
            },
          );
          if (controller.signal.aborted) return false;
          if (!response.ok) {
            conflicted.current = response.status === 409;
            setConflict(conflicted.current);
            setAuthRequired(response.status === 401);
            setError(
              response.status === 401
                ? "Your session ended. Your edits are still in this tab. Sign in in a new tab, then return here and retry saving."
                : response.error,
            );
            setStatus("Changes not saved");
            return false;
          }
          saved.current = response.data;
          setAuthRequired(false);
        } catch {
          if (!controller.signal.aborted) {
            setError(
              "Draft could not be saved. Your edits are still here; check your connection and retry.",
            );
            setStatus("Changes not saved");
          }
          return false;
        }
      }
      dirty.current = false;
      setStatus("Saved privately");
      return true;
    };
    flight.current = save().finally(() => {
      flight.current = null;
    });
    return flight.current;
  }, [initial.id]);

  const change = useCallback(
    (next: ProjectDraftContent) => {
      if (JSON.stringify(content.current) === JSON.stringify(next)) return;
      content.current = next;
      dirty.current = true;
      setStatus("Unsaved changes");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), 700);
    },
    [flush],
  );

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
      if (timer.current) clearTimeout(timer.current);
      request.current?.abort();
    };
  }, []);
  return { saved, change, flush, status, error, conflict, authRequired };
}

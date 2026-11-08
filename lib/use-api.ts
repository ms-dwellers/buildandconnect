"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api.ts";
import type { Page } from "./types.ts";

export type ApiFailure = { status: number; message: string };

/** Loads one `/api` resource. Pass `null` to skip loading until ready. */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | undefined>();
  const [error, setError] = useState<ApiFailure | null>(null);
  const [loading, setLoading] = useState(path !== null);
  const request = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const reload = useCallback(async () => {
    if (path === null) return;
    controller.current?.abort();
    const active = new AbortController();
    controller.current = active;
    const id = ++request.current;
    setLoading(true);
    try {
      const result = await api<T>(path, { signal: active.signal });
      if (id !== request.current || active.signal.aborted) return;
      if (result.ok) {
        setData(result.data);
        setError(null);
      } else setError({ status: result.status, message: result.error });
    } catch {
      if (id === request.current && !active.signal.aborted)
        setError({
          status: 0,
          message: "Check your connection and try again.",
        });
    } finally {
      if (id === request.current && !active.signal.aborted) setLoading(false);
    }
  }, [path]);
  useEffect(() => {
    void reload();
    return () => {
      controller.current?.abort();
      request.current++;
    };
  }, [reload]);
  return { data, error, loading, reload };
}

/** Cursor pagination for `{ data, nextCursor }` list endpoints. */
export function usePaged<T>(path: string | null, limit = 20) {
  const [items, setItems] = useState<T[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<ApiFailure | null>(null);
  const [loading, setLoading] = useState(path !== null);
  const request = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const fetchPage = useCallback(
    async (after: string, append: boolean) => {
      if (path === null) return;
      controller.current?.abort();
      const active = new AbortController();
      controller.current = active;
      const id = ++request.current;
      setLoading(true);
      const separator = path.includes("?") ? "&" : "?";
      try {
        const result = await api<Page<T>>(
          `${path}${separator}limit=${limit}&after=${encodeURIComponent(after)}`,
          { signal: active.signal },
        );
        if (id !== request.current || active.signal.aborted) return;
        if (!result.ok) {
          setError({ status: result.status, message: result.error });
          return;
        }
        setError(null);
        setItems((current) =>
          append ? [...current, ...result.data.data] : result.data.data,
        );
        setCursor(result.data.nextCursor);
      } catch {
        if (id === request.current && !active.signal.aborted)
          setError({
            status: 0,
            message: "Check your connection and try again.",
          });
      } finally {
        if (id === request.current && !active.signal.aborted) setLoading(false);
      }
    },
    [path, limit],
  );
  const reload = useCallback(() => fetchPage("", false), [fetchPage]);
  useEffect(() => {
    void reload();
    return () => {
      controller.current?.abort();
      request.current++;
    };
  }, [reload]);
  return {
    items,
    error,
    loading,
    reload,
    hasMore: cursor !== null,
    loadMore: () => (cursor ? fetchPage(cursor, true) : Promise.resolve()),
  };
}

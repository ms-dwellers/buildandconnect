"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { ApiFailure } from "@/lib/use-api";

export function useCareerResource<T>(path: string) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<ApiFailure | null>(null);
  const [loading, setLoading] = useState(true);
  const request = useRef<AbortController | null>(null);
  const reload = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError(null);
    try {
      const response = await api<T>(path, { signal: controller.signal });
      if (controller.signal.aborted) return;
      if (response.ok) setData(response.data);
      else setError({ status: response.status, message: response.error });
    } catch {
      if (!controller.signal.aborted)
        setError({
          status: 0,
          message: "Check your connection and try again.",
        });
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [path]);
  useEffect(() => {
    void reload();
    return () => request.current?.abort();
  }, [reload]);
  return { data, error, loading, reload };
}

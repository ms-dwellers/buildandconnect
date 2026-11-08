"use client";

import { useEffect } from "react";
import { knownAccount, useSession } from "@/lib/session";

/**
 * Keeps `data-theme="developer"` in sync with the live or remembered account.
 * A blocking head script applies the same hint before paint; this effect must
 * not clear that hint while the session is still loading.
 */
export function RoleTheme() {
  const { session } = useSession();
  useEffect(() => {
    if (session.status === "loading") return;
    const root = document.documentElement;
    if (knownAccount(session)?.role === "developer") {
      root.dataset.theme = "developer";
    } else {
      delete root.dataset.theme;
    }
  }, [session]);
  return null;
}

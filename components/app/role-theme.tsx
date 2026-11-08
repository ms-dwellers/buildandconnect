"use client";

import { useEffect } from "react";
import { useSession } from "@/lib/session";

/** Applies the warm developer theme for the whole signed-in developer session. */
export function RoleTheme() {
  const { session } = useSession();
  useEffect(() => {
    const root = document.documentElement;
    if (session.status === "member" && session.role === "developer") {
      root.dataset.theme = "developer";
    } else {
      delete root.dataset.theme;
    }
  }, [session]);
  return null;
}

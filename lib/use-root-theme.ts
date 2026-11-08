"use client";

import { useEffect, useState } from "react";

function rootTheme() {
  if (typeof document === "undefined") return "";
  const { dataset } = document.documentElement;
  return `${dataset.theme ?? ""}|${dataset.themePreview ?? ""}`;
}

/**
 * Changes whenever the root theme attributes change. WebGL scenes read tokens
 * once per mount, and the role theme can land after they start.
 */
export function useRootTheme() {
  const [theme, setTheme] = useState(rootTheme);
  useEffect(() => {
    const read = () => setTheme(rootTheme());
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "data-theme-preview"],
    });
    return () => observer.disconnect();
  }, []);
  return theme;
}

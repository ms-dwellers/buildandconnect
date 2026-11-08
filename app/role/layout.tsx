import type { Metadata } from "next";
import type { ReactNode } from "react";
import { pageTitle } from "@/lib/page-title";

export const metadata: Metadata = {
  title: pageTitle("Choose your account type"),
};

export default function RoleLayout({ children }: { children: ReactNode }) {
  return children;
}

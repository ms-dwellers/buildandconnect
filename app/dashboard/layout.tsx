import type { Metadata } from "next";
import type { ReactNode } from "react";
import { pageTitle } from "@/lib/page-title";

export const metadata: Metadata = { title: pageTitle("Dashboard") };

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return children;
}

import type { Metadata } from "next";
import { pageTitle } from "@/lib/page-title";
import { DebugConsole } from "./console";

export const metadata: Metadata = {
  title: pageTitle("Backend QA"),
  robots: { index: false, follow: false },
};

export default function DebugPage() {
  return <DebugConsole />;
}

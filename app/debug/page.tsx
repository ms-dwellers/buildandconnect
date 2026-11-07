import type { Metadata } from "next";
import { DebugConsole } from "./console";

export const metadata: Metadata = {
  title: "Backend QA | Build & Connect",
  robots: { index: false, follow: false },
};

export default function DebugPage() {
  return <DebugConsole />;
}

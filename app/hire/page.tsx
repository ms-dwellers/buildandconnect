import type { Metadata } from "next";
import { AppShell } from "@/components/app/app-shell";
import { EmployerIntake } from "@/components/hiring/employer-intake";
import "../wip-voice-ai/voice.css";

export const metadata: Metadata = {
  title: "Find a developer — Build & Connect",
  robots: { index: false, follow: false },
};

export default function HirePage() {
  return (
    <AppShell title="Find a developer">
      <EmployerIntake />
    </AppShell>
  );
}

import type { Metadata } from "next";
import { AppShell } from "@/components/app/app-shell";
import { CareerPath } from "@/components/career/career-path";

export const metadata: Metadata = {
  title: "Career path — Build & Connect",
  robots: { index: false, follow: false },
};

export default function CareerPage() {
  return (
    <AppShell title="Build toward your next role">
      <CareerPath />
    </AppShell>
  );
}

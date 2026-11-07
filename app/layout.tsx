import type { Metadata } from "next";
import "./globals.css";
import "../components/map/map.css";
import { MapJourneyProvider } from "@/components/map/map-journey";

export const metadata: Metadata = {
  title: "Build & Connect",
  description:
    "Connect early-career developers with people and companies building social-impact projects.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="relative">
        <div className="relative isolate flex min-h-svh flex-col">
          <MapJourneyProvider>{children}</MapJourneyProvider>
        </div>
      </body>
    </html>
  );
}

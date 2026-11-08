import type { Metadata } from "next";
import "./globals.css";
import "../components/map/map.css";
import { MapJourneyProvider } from "@/components/map/map-journey";
import { ToastProvider } from "@/components/ui/toast";
import { SessionProvider } from "@/lib/session";
import { OpportunityDraftProvider } from "@/lib/opportunity-draft-context";

export const metadata: Metadata = {
  title: "Build & Connect",
  icons: {
    icon: { url: "/brand/campfire-clasped-hands.svg", type: "image/svg+xml" },
  },
  description:
    "Connect early-career developers with requesters building social-impact projects.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="relative">
        <div className="relative isolate flex min-h-svh flex-col">
          <SessionProvider>
            <OpportunityDraftProvider>
              <ToastProvider>
                <MapJourneyProvider>{children}</MapJourneyProvider>
              </ToastProvider>
            </OpportunityDraftProvider>
          </SessionProvider>
        </div>
      </body>
    </html>
  );
}

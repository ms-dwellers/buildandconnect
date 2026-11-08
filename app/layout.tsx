import type { Metadata } from "next";
import "./globals.css";
import "../components/map/map.css";
import { MapJourneyProvider } from "@/components/map/map-journey";
import { ToastProvider } from "@/components/ui/toast";
import { RoleTheme } from "@/components/app/role-theme";
import { SessionProvider } from "@/lib/session";
import { MascotMotionProvider } from "@/lib/mascot-motion";
import { DemoReset } from "@/components/demo-reset";

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
          <MascotMotionProvider>
            <SessionProvider>
              <RoleTheme />
              <ToastProvider>
                <DemoReset />
                <MapJourneyProvider>{children}</MapJourneyProvider>
              </ToastProvider>
            </SessionProvider>
          </MascotMotionProvider>
        </div>
      </body>
    </html>
  );
}

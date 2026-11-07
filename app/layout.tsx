import type { Metadata } from "next";
import "./globals.css";

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
          {children}
        </div>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { pageTitle } from "@/lib/page-title";
import { VoiceStudio } from "./voice-studio";
import "./voice.css";

export const metadata: Metadata = {
  title: pageTitle("Voice studio"),
  description:
    "A quiet space to explore your next step. An interactive, local-only voice prototype.",
  robots: { index: false, follow: false },
};

export default function VoicePage() {
  return <VoiceStudio />;
}

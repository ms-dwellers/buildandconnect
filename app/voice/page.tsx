import type { Metadata } from "next";
import { VoiceStudio } from "./voice-studio";
import "./voice.css";
import { pageTitle } from "@/lib/page-title";

export const metadata: Metadata = {
  title: pageTitle("Voice studio"),
  description:
    "Record and send project answers one at a time, then review your brief before publishing.",
  robots: { index: false, follow: false },
};

export default function VoicePage() {
  return <VoiceStudio />;
}

import type { Metadata } from "next";
import { VoiceStudio } from "./voice-studio";
import "./voice.css";

export const metadata: Metadata = {
  title: "Voice studio — Build & Connect",
  description:
    "Describe your project with a voice conversation or fill out a project brief manually.",
  robots: { index: false, follow: false },
};

export default function VoicePage() {
  return <VoiceStudio />;
}

import { permanentRedirect } from "next/navigation";

export default function LegacyVoicePage() {
  permanentRedirect("/voice");
}

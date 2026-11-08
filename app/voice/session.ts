export type VoicePhase =
  | "ready"
  | "requesting"
  | "recording"
  | "stopping"
  | "recorded"
  | "transcribing"
  | "speaking"
  | "thinking"
  | "complete";
export function formatDuration(seconds: number) {
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")}`;
}

export function phaseLabel(phase: VoicePhase) {
  switch (phase) {
    case "ready":
      return "Ready";
    case "requesting":
      return "Waiting for microphone permission…";
    case "recording":
      return "Recording your answer";
    case "stopping":
      return "Finishing recording…";
    case "recorded":
      return "Recording ready to send";
    case "transcribing":
      return "Transcribing your answer…";
    case "speaking":
      return "Playing reply";
    case "thinking":
      return "Updating your brief and preparing a reply…";
    case "complete":
      return "Your brief is ready to review";
  }
}

export type VoicePhase =
  | "ready"
  | "connecting"
  | "speaking"
  | "listening"
  | "thinking"
  | "paused"
  | "ended";
export function formatDuration(seconds: number) {
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")}`;
}

export function isSessionActive(phase: VoicePhase) {
  return phase !== "ready" && phase !== "ended";
}

export function phaseLabel(phase: VoicePhase) {
  switch (phase) {
    case "ready":
      return "Ready";
    case "connecting":
      return "Starting…";
    case "speaking":
      return "Speaking";
    case "listening":
      return "Your turn";
    case "thinking":
      return "Thinking…";
    case "paused":
      return "Paused";
    case "ended":
      return "Session ended";
  }
}

export type VoicePhase =
  | "ready"
  | "connecting"
  | "speaking"
  | "listening"
  | "thinking"
  | "paused"
  | "ended";
export type DemoMessage = {
  id: number;
  speaker: "you" | "guide";
  text: string;
};

export const voiceStyles = [
  {
    id: "warm",
    label: "Warm",
    description: "Lower tone",
    rate: 0.86,
    pitch: 0.94,
  },
  {
    id: "neutral",
    label: "Neutral",
    description: "Even tone",
    rate: 0.92,
    pitch: 1,
  },
  {
    id: "soft",
    label: "Soft",
    description: "Gentle tone",
    rate: 0.8,
    pitch: 1.04,
  },
] as const;

export const starters = [
  {
    title: "Find a project",
    text: "I want to work on something meaningful. Where do I start?",
    reply:
      "Let’s start with what draws you in. Is there a cause you care about, a skill you’d like to use, or something you’ve always wanted to make?",
  },
  {
    title: "Practice an introduction",
    text: "Help me introduce myself without overthinking it.",
    reply:
      "Of course. Forget the perfect pitch. Start with something you care about, something you can offer, and one thing you’re curious to learn.",
  },
  {
    title: "Explore options",
    text: "I’m not quite sure what I want to do next.",
    reply:
      "You don’t need the whole plan just yet. Think about the last time you enjoyed making or helping with something. What made it feel worthwhile?",
  },
] as const;

export const greeting = "What would you like to work through?";
export const fallbackReply =
  "Let’s make a little room for that. What would one small, satisfying next step look like for you? It doesn’t have to be impressive. Just something that feels like a start.";

export function replyFor(text: string) {
  return (
    starters.find((starter) => starter.text === text)?.reply ?? fallbackReply
  );
}

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

export type MascotPose = "base" | "happy" | "crying" | "running";
export type MascotMotion = "still" | "once" | "loop";
export type MascotFeedback = "idle" | "loading" | "success" | "error";

export const MASCOT_FEEDBACK: Record<
  MascotFeedback,
  { pose: MascotPose; motion: MascotMotion }
> = {
  idle: { pose: "base", motion: "loop" },
  loading: { pose: "running", motion: "loop" },
  success: { pose: "happy", motion: "once" },
  error: { pose: "crying", motion: "once" },
};

export const MASCOT_REACTION_MS = 4000;
export const MASCOT_MOTION_STORAGE_KEY = "build-and-connect:mascot-motion";

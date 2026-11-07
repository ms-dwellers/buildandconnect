export function microphoneMotionRate(level: number) {
  const volume = Number.isFinite(level) ? Math.max(0, Math.min(1, level)) : 0;
  return 0.25 + volume ** 1.25 * 3.75;
}

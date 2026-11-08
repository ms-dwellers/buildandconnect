export function microphoneLevel(
  samples: Float32Array,
  previous: number,
  elapsedMs: number,
) {
  if (!samples.length) return 0;
  const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  const power = samples.reduce((sum, value) => sum + (value - mean) ** 2, 0);
  const rms = Math.sqrt(power / samples.length);
  const decibels = 20 * Math.log10(Math.max(rms, 0.000001));
  const target = Math.max(0, Math.min(1, (decibels + 48) / 36));
  const last = Number.isFinite(previous)
    ? Math.max(0, Math.min(1, previous))
    : 0;
  const duration = Number.isFinite(elapsedMs)
    ? Math.max(0, Math.min(250, elapsedMs))
    : 0;
  const smoothing = 1 - Math.exp(-duration / (target > last ? 45 : 220));
  return last + (target - last) * smoothing;
}

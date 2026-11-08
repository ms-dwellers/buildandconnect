export const MAX_RECORDING_SECONDS = 60;
export const MAX_RECORDING_BYTES = 2 * 1024 * 1024;
export const RECORDING_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/ogg;codecs=opus",
  "audio/mp4",
  "audio/webm",
];

export function recordingMimeType(isSupported: (type: string) => boolean) {
  return RECORDING_MIME_TYPES.find(isSupported) ?? null;
}

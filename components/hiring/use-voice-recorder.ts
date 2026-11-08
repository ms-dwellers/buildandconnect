"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { transcriptionResponseSchema } from "@/backend/hiring/voice-turn";
import { useAudioRecorder } from "./voice/use-audio-recorder";
import type { useMicrophone } from "./voice/use-microphone";

/** The legacy intake transcribes on stop; /voice explicitly sends its recording. */
export function useVoiceRecorder(
  microphone: ReturnType<typeof useMicrophone>,
  onText: (text: string) => void,
) {
  const recording = useAudioRecorder(microphone);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  const callback = useRef(onText);
  useEffect(() => {
    callback.current = onText;
  }, [onText]);
  const { audio, cancel: discard } = recording;

  const cancel = useCallback(() => {
    request.current?.abort();
    request.current = null;
    discard();
    setTranscribing(false);
    setError("");
  }, [discard]);
  useEffect(() => {
    if (!audio) return;
    const controller = new AbortController();
    request.current = controller;
    setTranscribing(true);
    setError("");
    void (async () => {
      try {
        const response = await api<unknown>("/hiring/transcribe", {
          method: "POST",
          headers: { "Content-Type": audio.type },
          body: audio,
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(50_000),
          ]),
        });
        if (controller.signal.aborted) return;
        if (!response.ok) throw new Error(response.error);
        const result = transcriptionResponseSchema.safeParse(response.data);
        if (!result.success)
          throw new Error(
            "No speech was detected. Try again or type your answer.",
          );
        callback.current(result.data.text);
      } catch (failure) {
        if (!controller.signal.aborted)
          setError(
            failure instanceof Error
              ? failure.message
              : "Transcription was interrupted. Try again or type your answer.",
          );
      } finally {
        if (request.current === controller) {
          request.current = null;
          setTranscribing(false);
          discard();
        }
      }
    })();
    return () => {
      controller.abort();
      if (request.current === controller) request.current = null;
    };
  }, [audio, discard]);
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) cancel();
    };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      request.current?.abort();
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [cancel]);

  const status =
    transcribing ||
    recording.status === "stopping" ||
    recording.status === "recorded"
      ? "transcribing"
      : recording.status;
  return {
    status,
    error: error || recording.error,
    start: () => {
      if (!transcribing) {
        setError("");
        return recording.start();
      }
    },
    stop: recording.stop,
    cancel,
  };
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MAX_RECORDING_BYTES,
  MAX_RECORDING_SECONDS,
  recordingMimeType,
} from "@/lib/voice-recording";
import type { useMicrophone } from "./use-microphone";

type Capture = {
  recorder: MediaRecorder;
  chunks: Blob[];
  bytes: number;
  keep: boolean;
  timer: ReturnType<typeof setTimeout>;
  clock: ReturnType<typeof setInterval>;
};

/** Capture locally. Stopping never uploads audio or starts another recording. */
export function useAudioRecorder({
  enable,
  disable,
}: ReturnType<typeof useMicrophone>) {
  const [status, setStatus] = useState<
    "idle" | "requesting" | "recording" | "stopping" | "recorded"
  >("idle");
  const [audio, setAudio] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>();
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const capture = useRef<Capture | null>(null);
  const pending = useRef(false);
  const generation = useRef(0);
  const mounted = useRef(false);
  const savedAudio = useRef<Blob | null>(null);

  const cancel = useCallback(() => {
    generation.current++;
    pending.current = false;
    const current = capture.current;
    capture.current = null;
    if (current) {
      clearTimeout(current.timer);
      clearInterval(current.clock);
      current.recorder.ondataavailable = null;
      current.recorder.onstop = null;
      current.recorder.onerror = null;
      if (current.recorder.state !== "inactive") {
        try {
          current.recorder.stop();
        } catch {
          /* Tracks are still released below if the browser already stopped. */
        }
      }
      current.chunks.length = 0;
    }
    disable();
    savedAudio.current = null;
    if (mounted.current) {
      setStatus("idle");
      setAudio(null);
      setSeconds(0);
      setError("");
    }
  }, [disable]);

  const stop = useCallback(() => {
    const current = capture.current;
    if (!current || current.keep || current.recorder.state === "inactive")
      return;
    current.keep = true;
    clearTimeout(current.timer);
    clearInterval(current.clock);
    setStatus("stopping");
    try {
      current.recorder.stop();
    } catch {
      cancel();
      setError("The recording could not finish. Try again or type an answer.");
    }
  }, [cancel]);

  const start = useCallback(async () => {
    if (!mounted.current || pending.current || capture.current) return;
    setError("");
    if (typeof MediaRecorder === "undefined") {
      setError(
        "Recording is unavailable in this browser. Type your answer instead.",
      );
      return;
    }
    const mimeType = recordingMimeType((type) =>
      MediaRecorder.isTypeSupported(type),
    );
    if (!mimeType) {
      setError(
        "No supported recording format is available. Type your answer instead.",
      );
      return;
    }
    const attempt = ++generation.current;
    pending.current = true;
    setStatus("requesting");
    const stream = await enable();
    if (attempt !== generation.current || !mounted.current) return;
    pending.current = false;
    if (!stream) {
      setStatus(savedAudio.current ? "recorded" : "idle");
      return;
    }
    try {
      const recorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 64000,
      });
      const startedAt = performance.now();
      const current: Capture = {
        recorder,
        chunks: [],
        bytes: 0,
        keep: false,
        timer: setTimeout(stop, MAX_RECORDING_SECONDS * 1000),
        clock: setInterval(
          () =>
            setSeconds(
              Math.min(
                MAX_RECORDING_SECONDS,
                Math.floor((performance.now() - startedAt) / 1000),
              ),
            ),
          250,
        ),
      };
      capture.current = current;
      recorder.ondataavailable = (event) => {
        if (capture.current !== current || !event.data.size) return;
        current.bytes += event.data.size;
        if (current.bytes > MAX_RECORDING_BYTES) {
          cancel();
          setError("The recording is too large. Record a shorter answer.");
          return;
        }
        current.chunks.push(event.data);
      };
      recorder.onerror = () => {
        cancel();
        setError(
          "Recording stopped unexpectedly. Try again or type an answer.",
        );
      };
      recorder.onstop = () => {
        clearTimeout(current.timer);
        clearInterval(current.clock);
        if (capture.current !== current || attempt !== generation.current)
          return;
        capture.current = null;
        disable();
        const blob = new Blob(current.chunks, { type: recorder.mimeType });
        current.chunks.length = 0;
        if (!current.keep || !blob.size) {
          setStatus("idle");
          setError(
            "The recording ended without a usable answer. Record again or type instead.",
          );
          return;
        }
        savedAudio.current = blob;
        setAudio(blob);
        setSeconds(
          Math.min(
            MAX_RECORDING_SECONDS,
            Math.floor((performance.now() - startedAt) / 1000),
          ),
        );
        setStatus("recorded");
      };
      savedAudio.current = null;
      setAudio(null);
      setSeconds(0);
      recorder.start(250);
      setStatus("recording");
    } catch {
      cancel();
      setError("The recording could not start. Try again or type an answer.");
    }
  }, [enable, disable, cancel, stop]);

  useEffect(() => {
    if (!audio) {
      setAudioUrl(undefined);
      return;
    }
    const url = URL.createObjectURL(audio);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [audio]);
  useEffect(() => {
    mounted.current = true;
    const hidden = () => {
      if (document.hidden && (capture.current || pending.current)) cancel();
    };
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("pagehide", cancel);
    return () => {
      mounted.current = false;
      cancel();
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("pagehide", cancel);
    };
  }, [cancel]);
  return { status, audio, audioUrl, seconds, error, start, stop, cancel };
}

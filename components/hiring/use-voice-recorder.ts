"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import {
  MAX_RECORDING_BYTES,
  MAX_RECORDING_SECONDS,
  recordingMimeType,
} from "@/lib/voice-recording";
import type { useMicrophone } from "@/app/voice/use-microphone";

type Recording = {
  recorder: MediaRecorder;
  chunks: Blob[];
  bytes: number;
  timer: ReturnType<typeof setTimeout>;
  send: boolean;
};

export function useVoiceRecorder(
  microphone: ReturnType<typeof useMicrophone>,
  onText: (text: string) => void,
) {
  const [status, setStatus] = useState<
    "idle" | "requesting" | "recording" | "transcribing"
  >("idle");
  const [error, setError] = useState("");
  const capture = useRef<Recording | null>(null);
  const request = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const mounted = useRef(false);
  const callback = useRef(onText);
  const { enable, disable } = microphone;
  useEffect(() => {
    callback.current = onText;
  }, [onText]);

  const cancel = useCallback(() => {
    generation.current++;
    request.current?.abort();
    request.current = null;
    const current = capture.current;
    capture.current = null;
    if (current) {
      clearTimeout(current.timer);
      current.recorder.ondataavailable = null;
      current.recorder.onstop = null;
      current.recorder.onerror = null;
      if (current.recorder.state !== "inactive") current.recorder.stop();
      current.chunks.length = 0;
    }
    disable();
    if (mounted.current) setStatus("idle");
  }, [disable]);

  const stop = useCallback(() => {
    const current = capture.current;
    if (!current || current.recorder.state === "inactive") return;
    current.send = true;
    clearTimeout(current.timer);
    setStatus("transcribing");
    current.recorder.stop();
    disable();
  }, [disable]);

  const start = useCallback(async () => {
    if (!mounted.current || capture.current || request.current) return;
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
    setStatus("requesting");
    const stream = await enable();
    if (attempt !== generation.current || !mounted.current) return;
    if (!stream) {
      setStatus("idle");
      return;
    }
    try {
      const recorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 64000,
      });
      const current: Recording = {
        recorder,
        chunks: [],
        bytes: 0,
        timer: setTimeout(stop, MAX_RECORDING_SECONDS * 1000),
        send: false,
      };
      capture.current = current;
      recorder.ondataavailable = (event) => {
        if (capture.current !== current || !event.data.size) return;
        current.bytes += event.data.size;
        if (current.bytes > MAX_RECORDING_BYTES) {
          cancel();
          setError("The recording is too large. Try a shorter answer.");
          return;
        }
        current.chunks.push(event.data);
      };
      recorder.onerror = () => {
        cancel();
        setError(
          "Recording stopped unexpectedly. Try again or type your answer.",
        );
      };
      recorder.onstop = async () => {
        clearTimeout(current.timer);
        if (capture.current !== current) return;
        capture.current = null;
        disable();
        if (!current.send) {
          current.chunks.length = 0;
          setStatus("idle");
          return;
        }
        const audio = new Blob(current.chunks, { type: recorder.mimeType });
        current.chunks.length = 0;
        const controller = new AbortController();
        request.current = controller;
        try {
          const response = await api<{ text: string }>("/hiring/transcribe", {
            method: "POST",
            headers: { "Content-Type": audio.type },
            body: audio,
            signal: AbortSignal.any([
              controller.signal,
              AbortSignal.timeout(50_000),
            ]),
          });
          if (attempt !== generation.current || !mounted.current) return;
          if (!response.ok) setError(response.error);
          else if (!response.data.text.trim())
            setError("No speech was detected. Try again or type your answer.");
          else callback.current(response.data.text);
        } catch {
          if (attempt === generation.current && mounted.current)
            setError(
              "Transcription was interrupted. Try again or type your answer.",
            );
        } finally {
          if (request.current === controller) request.current = null;
          if (attempt === generation.current && mounted.current)
            setStatus("idle");
        }
      };
      recorder.start(250);
      setStatus("recording");
    } catch {
      cancel();
      setError("The recording could not start. Try again or type your answer.");
    }
  }, [enable, disable, cancel, stop]);

  useEffect(() => {
    mounted.current = true;
    const hidden = () => {
      if (document.hidden) cancel();
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

  return { status, error, start, stop, cancel };
}

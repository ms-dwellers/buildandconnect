"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { microphoneLevel } from "./microphone-level";

type MicrophoneStatus = "off" | "requesting" | "on" | "error";
type Capture = {
  context: AudioContext;
  stream?: MediaStream;
  source?: MediaStreamAudioSourceNode;
  analyser?: AnalyserNode;
  frame?: number;
};

function microphoneError(error: unknown) {
  const name = error instanceof Error ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError")
    return "Microphone access was blocked. Allow it in your browser, then try again.";
  if (name === "NotFoundError")
    return "No microphone was found. Connect one and try again.";
  return "The microphone could not start. Check that it is available and try again.";
}

export function useMicrophone() {
  const [status, setStatus] = useState<MicrophoneStatus>("off");
  const [error, setError] = useState("");
  const level = useRef(0);
  const capture = useRef<Capture | null>(null);
  const generation = useRef(0);
  const mounted = useRef(false);

  const release = useCallback(() => {
    generation.current++;
    level.current = 0;
    const current = capture.current;
    capture.current = null;
    if (!current) return;
    if (current.frame !== undefined) cancelAnimationFrame(current.frame);
    current.stream?.getTracks().forEach((track) => {
      track.onended = null;
      track.stop();
    });
    current.source?.disconnect();
    current.analyser?.disconnect();
    if (current.context.state !== "closed")
      void current.context.close().catch(() => {});
  }, []);

  const disable = useCallback(() => {
    release();
    if (mounted.current) {
      setStatus("off");
      setError("");
    }
  }, [release]);

  const enable = useCallback(async () => {
    if (capture.current || !mounted.current) return;
    if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext) {
      setStatus("error");
      setError(
        "Microphone input is unavailable. Open this page in a supported browser over HTTPS.",
      );
      return;
    }
    const attempt = ++generation.current;
    setStatus("requesting");
    setError("");
    let stream: MediaStream | undefined;
    try {
      const context = new AudioContext();
      const current: Capture = { context };
      capture.current = current;
      await context.resume();
      if (attempt !== generation.current || !mounted.current) return;
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
        },
        video: false,
      });
      if (attempt !== generation.current || !mounted.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      if (!stream.getAudioTracks().length) throw new Error("No audio track");
      current.stream = stream;
      current.source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      current.analyser = analyser;
      analyser.fftSize = 1024;
      current.source.connect(analyser);
      const samples = new Float32Array(analyser.fftSize);
      let previous = performance.now();
      const sample = (now: number) => {
        if (capture.current !== current) return;
        analyser.getFloatTimeDomainData(samples);
        level.current = microphoneLevel(samples, level.current, now - previous);
        previous = now;
        current.frame = requestAnimationFrame(sample);
      };
      stream.getAudioTracks().forEach((track) => {
        track.onended = disable;
      });
      current.frame = requestAnimationFrame(sample);
      setStatus("on");
      return stream;
    } catch (cause) {
      stream?.getTracks().forEach((track) => track.stop());
      if (attempt !== generation.current || !mounted.current) return;
      release();
      setStatus("error");
      setError(microphoneError(cause));
    }
  }, [disable, release]);

  useEffect(() => {
    mounted.current = true;
    const hidden = () => {
      if (document.hidden) disable();
    };
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("pagehide", disable);
    return () => {
      mounted.current = false;
      release();
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("pagehide", disable);
    };
  }, [disable, release]);

  return { status, error, level, enable, disable };
}

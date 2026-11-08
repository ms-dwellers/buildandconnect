"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useSpokenReply() {
  const [enabled, setEnabled] = useState(true);
  const [status, setStatus] = useState<
    "idle" | "loading" | "playing" | "available"
  >("idle");
  const [error, setError] = useState("");
  const preference = useRef(true);
  const request = useRef<AbortController | null>(null);
  const clip = useRef<{
    text: string;
    audio: HTMLAudioElement;
    url: string;
  } | null>(null);

  const stop = useCallback(() => {
    request.current?.abort();
    request.current = null;
    const current = clip.current;
    clip.current = null;
    if (current) {
      current.audio.onended = null;
      current.audio.onerror = null;
      current.audio.pause();
      current.audio.removeAttribute("src");
      current.audio.load();
      URL.revokeObjectURL(current.url);
    }
    setStatus("idle");
    setError("");
  }, []);

  async function speak(text: string) {
    stop();
    if (!preference.current || document.hidden) return;
    const controller = new AbortController();
    request.current = controller;
    setError("");
    setStatus("loading");
    try {
      const response = await fetch("/api/hiring/speech", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(35_000),
        ]),
      });
      if (
        !response.ok ||
        !response.headers.get("Content-Type")?.startsWith("audio/")
      ) {
        await response.body?.cancel();
        throw new Error("Speech unavailable");
      }
      const blob = await response.blob();
      if (request.current !== controller) return;
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      clip.current = { text, audio, url };
      audio.onended = () => {
        if (clip.current?.audio === audio) setStatus("available");
      };
      audio.onerror = () => {
        if (clip.current?.audio === audio) {
          stop();
          setError(
            "The reply could not play. Read it below or retry playback.",
          );
        }
      };
      try {
        await audio.play();
        if (request.current === controller) setStatus("playing");
      } catch {
        if (request.current === controller) {
          setStatus("available");
          setError("Press Play reply to hear the response, or read it below.");
        }
      }
    } catch {
      if (request.current === controller) {
        setStatus("idle");
        setError(
          "The spoken reply is unavailable. You can still read the reply and continue.",
        );
      }
    } finally {
      if (request.current === controller) request.current = null;
    }
  }

  async function replay(text: string) {
    const current = clip.current;
    if (!current || current.text !== text) {
      await speak(text);
      return;
    }
    setError("");
    current.audio.currentTime = 0;
    try {
      await current.audio.play();
      if (clip.current === current) setStatus("playing");
    } catch {
      if (clip.current === current) {
        setStatus("available");
        setError(
          "Playback is blocked. Read the reply or try Play reply again.",
        );
      }
    }
  }

  function toggle() {
    preference.current = !preference.current;
    setEnabled(preference.current);
    setError("");
    if (!preference.current) stop();
  }
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) stop();
    };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [stop]);
  return { enabled, status, error, speak, replay, stop, toggle };
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { emptyHiringBrief, type HiringMessage } from "@/backend/hiring/schemas";
import {
  transcriptionResponseSchema,
  voiceTurnRequest,
  voiceTurnResponseSchema,
} from "@/backend/hiring/voice-turn";
import { useMicrophone } from "@/components/hiring/voice/use-microphone";
import { useAudioRecorder } from "@/components/hiring/voice/use-audio-recorder";
import { useSpokenReply } from "./use-spoken-reply";
import type { VoicePhase } from "./session";

export function useVoiceConversation() {
  const microphone = useMicrophone();
  const recorder = useAudioRecorder(microphone);
  const speech = useSpokenReply();
  const [messages, setMessages] = useState<HiringMessage[]>([]);
  const [brief, setBrief] = useState(emptyHiringBrief);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [pendingAnswer, setPendingAnswer] = useState("");
  const [readyForReview, setReadyForReview] = useState(false);
  const [operation, setOperation] = useState<
    "idle" | "transcribing" | "thinking"
  >("idle");
  const history = useRef<HiringMessage[]>([]);
  const currentBrief = useRef(brief);
  const request = useRef<AbortController | null>(null);
  const processing = operation !== "idle";
  const phase: VoicePhase =
    operation !== "idle"
      ? operation
      : recorder.status !== "idle"
        ? recorder.status
        : speech.status === "playing"
          ? "speaking"
          : readyForReview
            ? "complete"
            : "ready";
  const agentText = messages.at(-1)?.content ?? "What would you like to build?";

  async function sendTurn(audio: Blob | null, answer: string) {
    if (request.current) return false;
    const controller = new AbortController();
    request.current = controller;
    speech.stop();
    setError("");
    let content = answer.trim();
    try {
      if (audio) {
        setOperation("transcribing");
        const response = await api<unknown>("/hiring/transcribe", {
          method: "POST",
          headers: { "Content-Type": audio.type },
          body: audio,
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(50_000),
          ]),
        });
        if (request.current !== controller) return false;
        if (!response.ok) throw new Error(response.error);
        const transcription = transcriptionResponseSchema.safeParse(
          response.data,
        );
        if (!transcription.success)
          throw new Error(
            "No usable speech was detected. Record again or type an answer.",
          );
        content = [content, transcription.data.text]
          .filter(Boolean)
          .join("\n\n");
        setDraft(content);
        recorder.cancel();
      }
      if (!content || content.length > 3000)
        throw new Error(
          "Keep each answer within 3,000 characters. Edit the transcription below before sending.",
        );
      const input = voiceTurnRequest(
        history.current,
        content,
        currentBrief.current,
      );
      setPendingAnswer(content);
      setOperation("thinking");
      const response = await api<unknown>("/hiring/turn", {
        method: "POST",
        body: JSON.stringify(input),
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(50_000),
        ]),
      });
      if (request.current !== controller) return false;
      if (!response.ok) throw new Error(response.error);
      const parsed = voiceTurnResponseSchema.safeParse(response.data);
      if (!parsed.success)
        throw new Error(
          "The reply was incomplete. Your answer is still here; try sending it again.",
        );
      const result = parsed.data;
      const next: HiringMessage[] = [
        ...history.current,
        { role: "user", content },
        { role: "assistant", content: result.reply },
      ];
      history.current = next;
      currentBrief.current = result.brief;
      setMessages(next);
      setBrief(result.brief);
      setReadyForReview(result.readyForReview);
      setDraft("");
      void speech.speak(result.reply);
      return true;
    } catch (failure) {
      if (request.current === controller)
        setError(
          failure instanceof Error
            ? failure.message
            : "This answer could not be processed. Your answer has been kept; try again.",
        );
      return false;
    } finally {
      if (request.current === controller) {
        request.current = null;
        setOperation("idle");
        setPendingAnswer("");
      }
    }
  }

  const cancelProcessing = useCallback(() => {
    request.current?.abort();
    request.current = null;
    setOperation("idle");
    setPendingAnswer("");
  }, []);

  function record() {
    if (request.current) return;
    speech.stop();
    setError("");
    void recorder.start();
  }
  function send() {
    if (recorder.status !== "idle" || !draft.trim())
      return Promise.resolve(false);
    return sendTurn(null, draft);
  }
  function sendRecording() {
    if (recorder.status !== "recorded" || !recorder.audio)
      return Promise.resolve(false);
    return sendTurn(recorder.audio, draft);
  }
  function prepareReview() {
    cancelProcessing();
    recorder.cancel();
    speech.stop();
  }
  function reset() {
    prepareReview();
    history.current = [];
    currentBrief.current = emptyHiringBrief();
    setMessages([]);
    setBrief(currentBrief.current);
    setDraft("");
    setError("");
    setReadyForReview(false);
  }
  useEffect(
    () => () => {
      request.current?.abort();
      request.current = null;
    },
    [],
  );

  return {
    phase,
    messages,
    brief,
    draft,
    setDraft,
    pendingAnswer,
    readyForReview,
    processing,
    agentText,
    error: error || recorder.error || microphone.error,
    recorder,
    microphone: microphone.level,
    speech,
    record,
    send,
    sendRecording,
    cancelProcessing,
    prepareReview,
    reset,
  };
}

"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createProjectDraft } from "@/lib/project-drafts";
import { projectDraftFromBrief } from "@/backend/project-drafts";
import {
  ArrowLeftIcon,
  ArrowUpIcon,
  CheckIcon,
  HandIcon,
  MicIcon,
  PauseIcon,
  PlayIcon,
  RotateCcwIcon,
  SquareIcon,
  Volume2Icon,
  VolumeXIcon,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { RequireRole } from "@/components/app/require-role";
import { BriefForm } from "@/components/hiring/brief-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Aurora } from "./aurora";
import { isSessionActive } from "./session";
import { useVoiceConversation } from "./use-voice-conversation";
import { RollingText } from "./rolling-text";

export function VoiceStudio() {
  return <RequireRole roles={["requester"]}>{() => <Studio />}</RequireRole>;
}

function Studio() {
  const router = useRouter();
  const reviewId = useRef<string | null>(null);
  const reviewPending = useRef(false);
  const [reviewError, setReviewError] = useState("");
  const conversation = useVoiceConversation();
  const { phase, messages, brief, sound } = conversation;
  const [moving, setMoving] = useState(true);
  const [draft, setDraft] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const transcript = useRef<HTMLDivElement>(null);
  const briefPanel = useRef<HTMLElement>(null);
  const conversationControl = useRef<HTMLButtonElement>(null);
  const active = isSessionActive(phase);
  const canReply =
    !reviewing && ["ready", "listening", "paused", "ended"].includes(phase);

  useEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const changed = () => setMoving(!preference.matches);
    changed();
    preference.addEventListener("change", changed);
    return () => preference.removeEventListener("change", changed);
  }, []);
  useEffect(() => {
    const element = transcript.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages, phase]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim() || !canReply) return;
    const text = draft;
    setDraft("");
    void conversation.send(text).then((sent) => {
      if (!sent) setDraft(text);
    });
  }

  function reset() {
    conversation.reset();
    setDraft("");
    setReviewing(false);
    reviewId.current = null;
    setReviewError("");
  }

  async function review() {
    if (reviewPending.current) return;
    reviewPending.current = true;
    conversation.prepareReview();
    setReviewing(true);
    setReviewError("");
    try {
      reviewId.current ??= crypto.randomUUID();
      const saved = await createProjectDraft(
        projectDraftFromBrief(brief),
        reviewId.current,
      );
      router.push(`/projects/drafts/${saved.id}`);
    } catch (failure) {
      setReviewError(
        failure instanceof Error
          ? failure.message
          : "The private draft could not be saved. Try again.",
      );
      setReviewing(false);
    } finally {
      reviewPending.current = false;
    }
  }

  return (
    <div className="voice-studio">
      <a className="landing-skip-link" href="#voice-main">
        Skip to voice studio
      </a>
      <header className="voice-nav">
        <a href="/" className="voice-brand">
          <BrandLogo />
          <span>Build &amp; Connect</span>
        </a>
        <span className="voice-nav-divider" aria-hidden="true" />
        <span className="voice-nav-title">Voice studio</span>
        <div className="voice-nav-end">
          <Button variant="ghost" render={<a href="/" />}>
            <ArrowLeftIcon aria-hidden="true" />
            Back home
          </Button>
        </div>
      </header>
      <main id="voice-main" tabIndex={-1} className="voice-main">
        <h1 className="sr-only">Think out loud.</h1>
        <div className="voice-workspace">
          <section className="voice-session" aria-label="Voice conversation">
            <div className="voice-stage" data-phase={phase}>
              <Aurora
                moving={moving && phase !== "paused"}
                speaking={phase === "speaking"}
                microphone={
                  phase === "listening" ? conversation.microphone : undefined
                }
              />
              <div className="voice-presence">
                <div className="voice-presence-caption">
                  <p className="voice-phase" role="status" aria-atomic="true">
                    <RollingText
                      text={conversation.agentText}
                      animated={messages.some(
                        (message) => message.role === "assistant",
                      )}
                    />
                  </p>
                </div>
              </div>
              <div className="voice-controls">
                <Button
                  variant="outline"
                  size="icon-xl"
                  aria-label={
                    sound ? "Mute spoken replies" : "Enable spoken replies"
                  }
                  aria-pressed={sound}
                  onClick={conversation.toggleSound}
                >
                  {sound ? (
                    <Volume2Icon aria-hidden="true" />
                  ) : (
                    <VolumeXIcon aria-hidden="true" />
                  )}
                </Button>
                {!active ? (
                  <Button
                    size="xl"
                    className="voice-start"
                    onClick={conversation.resume}
                    disabled={reviewing}
                  >
                    <MicIcon aria-hidden="true" />
                    {phase === "ended"
                      ? "Continue conversation"
                      : "Begin conversation"}
                  </Button>
                ) : (
                  <Button
                    ref={conversationControl}
                    size="xl"
                    className="voice-start"
                    disabled={reviewing}
                    onClick={
                      phase === "paused"
                        ? conversation.resume
                        : conversation.pause
                    }
                  >
                    {phase === "paused" ? (
                      <PlayIcon aria-hidden="true" />
                    ) : (
                      <PauseIcon aria-hidden="true" />
                    )}
                    {phase === "paused"
                      ? "Resume conversation"
                      : "Pause conversation"}
                  </Button>
                )}
                {active ? (
                  <Button
                    variant="outline"
                    size="icon-xl"
                    aria-label="End conversation"
                    onClick={conversation.end}
                  >
                    <SquareIcon aria-hidden="true" />
                  </Button>
                ) : (
                  <span className="voice-control-spacer" />
                )}
              </div>
              {phase === "speaking" && (
                <Button
                  variant="outline"
                  className="mt-3"
                  onClick={() => {
                    void conversation.interrupt();
                    conversationControl.current?.focus();
                  }}
                >
                  <HandIcon aria-hidden="true" />
                  Interrupt
                </Button>
              )}
              {conversation.error && (
                <p className="voice-device-note" role="alert">
                  {conversation.error}
                </p>
              )}
              {!reviewing && (
                <Button variant="ghost" className="mt-3" onClick={review}>
                  {messages.length
                    ? "Review project brief"
                    : "Fill out manually"}
                </Button>
              )}
              {reviewError && (
                <p role="alert" className="voice-device-note">
                  {reviewError}
                </p>
              )}
            </div>
          </section>
          <section
            className="voice-conversation"
            aria-labelledby="conversation-title"
          >
            <div className="voice-conversation-heading">
              <h2 id="conversation-title">Transcript</h2>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Clear conversation"
                disabled={reviewing || (!messages.length && phase === "ready")}
                onClick={reset}
              >
                <RotateCcwIcon aria-hidden="true" />
              </Button>
            </div>
            <div
              className="voice-transcript"
              ref={transcript}
              tabIndex={0}
              role="log"
              aria-label="Project conversation"
              aria-live="polite"
            >
              {messages.length === 0 ? (
                <div className="voice-empty">
                  <h3>No conversation yet</h3>
                </div>
              ) : (
                messages.map((message, index) => (
                  <article
                    key={index}
                    className={`voice-message voice-message-${message.role === "user" ? "you" : "guide"}`}
                  >
                    <span>{message.role === "user" ? "You" : "Assistant"}</span>
                    <p>{message.content}</p>
                  </article>
                ))
              )}
              {phase === "ended" && (
                <div className="voice-ended">
                  <CheckIcon aria-hidden="true" />
                  Session ended.
                </div>
              )}
            </div>
            <form className="voice-compose" onSubmit={submit}>
              <Label htmlFor="voice-thought" className="sr-only">
                Your answer
              </Label>
              <Input
                id="voice-thought"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Or type an answer…"
                maxLength={3000}
                disabled={!canReply}
                autoComplete="off"
              />
              <Button
                type="submit"
                size="icon"
                aria-label="Send answer"
                disabled={!canReply || !draft.trim()}
              >
                <ArrowUpIcon aria-hidden="true" />
              </Button>
            </form>
          </section>
          <section
            className="voice-conversation"
            ref={briefPanel}
            tabIndex={-1}
            aria-labelledby="voice-brief-title"
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 id="voice-brief-title" className="text-lg font-semibold">
                Project brief
              </h2>
              {!reviewing && (
                <Button variant="outline" onClick={review}>
                  {messages.length ? "Review and edit" : "Fill out manually"}
                </Button>
              )}
            </div>
            {conversation.extracting && (
              <p role="status" className="mb-4 text-sm text-muted-foreground">
                Updating brief…
              </p>
            )}
            {conversation.briefError && (
              <div className="mb-4 space-y-2">
                <p role="alert">{conversation.briefError}</p>
                <Button variant="outline" onClick={conversation.retryBrief}>
                  Retry brief update
                </Button>
              </div>
            )}
            <p className="mb-4 text-xs text-muted-foreground">
              Reviewing saves project details as a private draft. Audio and
              transcripts are not saved in the draft.
            </p>
            {reviewing ? (
              <p role="status">Saving your private project draft…</p>
            ) : (
              <BriefForm
                key={JSON.stringify(brief)}
                brief={brief}
                pending={false}
                disabled
                preview
                onSubmit={() => {}}
              />
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowUpIcon,
  MicIcon,
  PlayIcon,
  RotateCcwIcon,
  SendIcon,
  SquareIcon,
  Volume2Icon,
  VolumeXIcon,
  XIcon,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { RequireRole } from "@/components/app/require-role";
import { BriefForm } from "@/components/hiring/brief-form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ConfirmButton } from "@/components/dashboards/parts";
import { createProjectDraft } from "@/lib/project-drafts";
import { projectDraftFromBrief } from "@/backend/project-drafts";
import { MAX_RECORDING_SECONDS } from "@/lib/voice-recording";
import { Aurora } from "./aurora";
import { formatDuration, phaseLabel } from "./session";
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
  const [reviewing, setReviewing] = useState(false);
  const [moving, setMoving] = useState(true);
  const transcript = useRef<HTMLDivElement>(null);
  const recordingPreview = useRef<HTMLAudioElement>(null);
  const conversation = useVoiceConversation();
  const {
    phase,
    messages,
    brief,
    recorder,
    speech,
    processing,
    readyForReview,
  } = conversation;
  const capturing = ["requesting", "recording", "stopping"].includes(
    recorder.status,
  );
  const canReply = !reviewing && !processing && recorder.status === "idle";
  const canReview =
    !reviewing && !processing && !capturing && recorder.status !== "recorded";

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
  }, [messages, conversation.pendingAnswer]);
  useEffect(() => {
    reviewId.current = null;
    setReviewError("");
  }, [brief]);
  useEffect(() => {
    const audio = recordingPreview.current;
    const hidden = () => {
      if (document.hidden) audio?.pause();
    };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      audio?.pause();
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [recorder.audioUrl]);

  function record() {
    recordingPreview.current?.pause();
    conversation.record();
  }
  function sendRecording() {
    recordingPreview.current?.pause();
    void conversation.sendRecording();
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (canReply) void conversation.send();
  }
  function reset() {
    conversation.reset();
    setReviewing(false);
    reviewId.current = null;
    setReviewError("");
  }
  async function review() {
    if (reviewPending.current || !canReview) return;
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
          <Button variant="ghost" render={<a href="/projects/new" />}>
            <ArrowLeftIcon aria-hidden="true" /> Back to projects
          </Button>
        </div>
      </header>
      <main id="voice-main" tabIndex={-1} className="voice-main">
        <h1 className="sr-only">Think out loud.</h1>
        <div className="voice-workspace">
          <section
            className="voice-session"
            aria-label="Recorded project conversation"
          >
            <div className="voice-stage" data-phase={phase}>
              <Aurora
                moving={moving}
                speaking={speech.status === "playing"}
                microphone={
                  phase === "recording" ? conversation.microphone : undefined
                }
              />
              <div className="voice-presence">
                <div className="voice-presence-caption">
                  <div
                    className="voice-phase"
                    aria-live="off"
                    aria-atomic="true"
                  >
                    <RollingText
                      text={conversation.agentText}
                      animated={messages.length > 0}
                    />
                  </div>
                </div>
              </div>
              <p className="voice-turn-status" role="status" aria-atomic="true">
                {phaseLabel(phase)}
                {phase === "recording" && (
                  <span className="voice-duration" aria-hidden="true">
                    {" "}
                    · {formatDuration(recorder.seconds)} /{" "}
                    {formatDuration(MAX_RECORDING_SECONDS)}
                  </span>
                )}
              </p>
              <div className="voice-controls">
                <Button
                  variant="outline"
                  size="icon-xl"
                  aria-label="Spoken replies"
                  aria-pressed={speech.enabled}
                  onClick={speech.toggle}
                  disabled={reviewing}
                >
                  {speech.enabled ? (
                    <Volume2Icon aria-hidden="true" />
                  ) : (
                    <VolumeXIcon aria-hidden="true" />
                  )}
                </Button>
                {processing ? (
                  <Button
                    size="xl"
                    className="voice-start"
                    onClick={conversation.cancelProcessing}
                  >
                    <XIcon aria-hidden="true" /> Cancel processing
                  </Button>
                ) : recorder.status === "recording" ? (
                  <Button
                    size="xl"
                    className="voice-start"
                    onClick={recorder.stop}
                  >
                    <SquareIcon aria-hidden="true" /> Stop recording
                  </Button>
                ) : recorder.status === "requesting" ||
                  recorder.status === "stopping" ? (
                  <Button size="xl" className="voice-start" disabled loading>
                    {recorder.status === "requesting"
                      ? "Opening microphone"
                      : "Finishing recording"}
                  </Button>
                ) : recorder.status === "recorded" ? (
                  <Button
                    size="xl"
                    className="voice-start"
                    onClick={sendRecording}
                    disabled={reviewing}
                  >
                    <SendIcon aria-hidden="true" /> Send recording
                  </Button>
                ) : readyForReview ? (
                  <Button
                    size="xl"
                    className="voice-start"
                    onClick={() => void review()}
                    loading={reviewing}
                  >
                    Review project brief
                  </Button>
                ) : (
                  <Button
                    size="xl"
                    className="voice-start"
                    onClick={record}
                    disabled={reviewing}
                  >
                    <MicIcon aria-hidden="true" />
                    {messages.length
                      ? "Record an answer"
                      : "Record your project"}
                  </Button>
                )}
                {capturing || recorder.status === "recorded" ? (
                  <Button
                    variant="outline"
                    size="icon-xl"
                    aria-label="Discard recording"
                    onClick={recorder.cancel}
                    disabled={processing}
                  >
                    <XIcon aria-hidden="true" />
                  </Button>
                ) : (
                  <span className="voice-control-spacer" />
                )}
              </div>
              {recorder.audioUrl && (
                <div className="voice-recording-preview">
                  <audio
                    ref={recordingPreview}
                    controls
                    preload="metadata"
                    src={recorder.audioUrl}
                    aria-label="Preview your recorded answer"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={processing || reviewing}
                    onClick={record}
                  >
                    <RotateCcwIcon aria-hidden="true" /> Record again
                  </Button>
                </div>
              )}
              <p className="voice-device-note">
                Your microphone is only on while recording. Audio is sent only
                when you choose Send recording. Up to 60 seconds per answer.
              </p>
              {speech.status === "playing" || speech.status === "loading" ? (
                <Button
                  variant="outline"
                  className="mt-3"
                  onClick={speech.stop}
                >
                  {speech.status === "loading"
                    ? "Cancel spoken reply"
                    : "Stop reply"}
                </Button>
              ) : (
                messages.length > 0 &&
                speech.enabled &&
                !processing &&
                !capturing &&
                recorder.status !== "recorded" && (
                  <Button
                    variant="outline"
                    className="mt-3"
                    onClick={() => void speech.replay(conversation.agentText)}
                  >
                    <PlayIcon aria-hidden="true" /> Play reply
                  </Button>
                )
              )}
              {readyForReview && canReply && (
                <Button
                  variant="ghost"
                  className="mt-3"
                  onClick={record}
                  disabled={reviewing}
                >
                  <MicIcon aria-hidden="true" /> Add another answer
                </Button>
              )}
              {conversation.error && (
                <p className="voice-device-note" role="alert">
                  {conversation.error}
                </p>
              )}
              {speech.error && (
                <p className="voice-device-note" role="status">
                  {speech.error}
                </p>
              )}
              {!readyForReview && (
                <Button
                  variant="ghost"
                  className="mt-3"
                  onClick={() => void review()}
                  disabled={!canReview}
                >
                  {messages.length
                    ? "Review brief so far"
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
              <h2 id="conversation-title">Conversation</h2>
              <ConfirmButton
                label="Start over"
                title="Clear this conversation?"
                description="Your unsaved answers, recording, and brief will be removed. Nothing has been published."
                confirmLabel="Clear conversation"
                variant="ghost"
                disabled={
                  reviewing ||
                  (!messages.length &&
                    !conversation.draft &&
                    recorder.status === "idle" &&
                    !processing)
                }
                onConfirm={reset}
              />
            </div>
            <div
              className="voice-transcript"
              ref={transcript}
              tabIndex={0}
              role="log"
              aria-label="Project conversation"
              aria-live="polite"
              aria-relevant="additions"
            >
              {!messages.length && !conversation.pendingAnswer ? (
                <div className="voice-empty">
                  <h3>No answers yet</h3>
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
              {conversation.pendingAnswer && (
                <article
                  className="voice-message voice-message-you"
                  aria-hidden="true"
                >
                  <span>Your answer · processing</span>
                  <p>{conversation.pendingAnswer}</p>
                </article>
              )}
            </div>
            <form className="voice-text-answer" onSubmit={submit}>
              <Label htmlFor="voice-thought">Or type an answer</Label>
              <Textarea
                id="voice-thought"
                value={conversation.draft}
                onChange={(event) => conversation.setDraft(event.target.value)}
                placeholder="I need a website for…"
                maxLength={3000}
                disabled={!canReply}
                className="[&_textarea]:max-h-40"
                aria-describedby="voice-answer-limit"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p
                  id="voice-answer-limit"
                  className="text-xs text-muted-foreground"
                >
                  {conversation.draft.length.toLocaleString()} / 3,000
                  characters
                </p>
                <Button
                  type="submit"
                  disabled={
                    !canReply ||
                    !conversation.draft.trim() ||
                    conversation.draft.length > 3000
                  }
                >
                  <ArrowUpIcon aria-hidden="true" /> Send answer
                </Button>
              </div>
            </form>
          </section>
          <section
            className="voice-conversation"
            aria-labelledby="voice-brief-title"
          >
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 id="voice-brief-title" className="text-lg font-semibold">
                Project brief
              </h2>
              <Button
                variant="outline"
                onClick={() => void review()}
                disabled={!canReview}
                loading={reviewing}
              >
                {messages.length ? "Review and edit" : "Fill out manually"}
              </Button>
            </div>
            {processing && (
              <p role="status" className="mb-4 text-sm text-muted-foreground">
                {phase === "transcribing"
                  ? "Transcribing your answer…"
                  : "Updating brief…"}
              </p>
            )}
            <p className="mb-4 text-xs text-muted-foreground">
              Reviewing saves project details as a private draft, not a
              published job. Recordings and transcripts are not saved in the
              draft.
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

"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createProjectDraft } from "@/lib/project-drafts";
import { projectDraftFromBrief } from "@/backend/project-drafts";
import { MicIcon, SquareIcon } from "lucide-react";
import { RequireRole, ErrorAlert } from "@/components/app/require-role";
import { Button } from "@/components/ui/button";
import { Card, CardPanel } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ConfirmButton } from "@/components/dashboards/parts";
import { Aurora } from "./voice/aurora";
import { Waveform } from "./voice/waveform";
import { useMicrophone } from "./voice/use-microphone";
import "./voice/intake.css";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import type { PublicDeveloper } from "@/lib/types";
import {
  emptyHiringBrief,
  type HiringBrief,
  type HiringMessage,
  type IntakeResponse,
  type MatchingCriteria,
} from "@/backend/hiring/schemas";
import { BriefForm } from "./brief-form";
import { useVoiceRecorder } from "./use-voice-recorder";

type Suggestions = {
  criteria: MatchingCriteria;
  considered: number;
  developers: {
    developerId: string;
    reason: string;
    needsDiscussion: string[];
    profile: PublicDeveloper;
  }[];
};

export function EmployerIntake({
  initialBrief,
}: {
  initialBrief?: HiringBrief;
}) {
  return (
    <RequireRole roles={["requester"]}>
      {() => <Intake initialBrief={initialBrief} />}
    </RequireRole>
  );
}

function Intake({ initialBrief }: { initialBrief?: HiringBrief }) {
  const router = useRouter();
  const config = useApi<{ transcription: boolean; matching: boolean }>(
    "/hiring/status",
  );
  const microphone = useMicrophone();
  const [draft, setDraft] = useState("");
  const recorder = useVoiceRecorder(microphone, (text) =>
    setDraft((previous) => [previous, text].filter(Boolean).join(" ")),
  );
  const [messages, setMessages] = useState<HiringMessage[]>([]);
  const [brief, setBrief] = useState<HiringBrief>(
    initialBrief ?? emptyHiringBrief,
  );
  const [stage, setStage] = useState<"conversation" | "review" | "results">(
    initialBrief ? "review" : "conversation",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);
  const [moving, setMoving] = useState(true);
  const request = useRef<AbortController | null>(null);
  const transcript = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const changed = () => setMoving(!preference.matches);
    changed();
    preference.addEventListener("change", changed);
    return () => preference.removeEventListener("change", changed);
  }, []);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (transcript.current)
      transcript.current.scrollTop = transcript.current.scrollHeight;
  }, [messages]);

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim() || busy || recorder.status !== "idle") return;
    const nextMessages: HiringMessage[] = [
      ...messages,
      { role: "user", content: draft.trim() },
    ];
    if (
      draft.length > 3000 ||
      nextMessages.length > 23 ||
      JSON.stringify({ messages: nextMessages }).length > 28000
    ) {
      setError(
        "This conversation is too long. Shorten your answer or review the brief so far.",
      );
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError("");
    try {
      const response = await api<IntakeResponse>("/hiring/brief", {
        method: "POST",
        body: JSON.stringify({ messages: nextMessages }),
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(50_000),
        ]),
      });
      if (request.current !== controller) return;
      if (!response.ok) {
        setError(response.error);
        return;
      }
      setBrief(response.data.brief);
      setMessages([
        ...nextMessages,
        { role: "assistant", content: response.data.reply },
      ]);
      setDraft("");
    } catch {
      if (request.current === controller)
        setError(
          "The answer could not be sent. Your text is still here; try again.",
        );
    } finally {
      if (request.current === controller) {
        request.current = null;
        setBusy(false);
      }
    }
  }

  async function findDevelopers(confirmed: HiringBrief) {
    if (busy) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError("");
    setBrief(confirmed);
    try {
      const response = await api<Suggestions>("/hiring/matches", {
        method: "POST",
        body: JSON.stringify({ brief: confirmed }),
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(110_000),
        ]),
      });
      if (request.current !== controller) return;
      if (!response.ok) {
        setError(response.error);
        return;
      }
      setSuggestions(response.data);
      setStage("results");
    } catch {
      if (request.current === controller)
        setError(
          "Suggestions could not be loaded. Your brief is unchanged; try again.",
        );
    } finally {
      if (request.current === controller) {
        request.current = null;
        setBusy(false);
      }
    }
  }

  function reset() {
    request.current?.abort();
    request.current = null;
    recorder.cancel();
    setBusy(false);
    setMessages([]);
    setBrief(emptyHiringBrief());
    setDraft("");
    setSuggestions(null);
    setError("");
    setStage("conversation");
  }

  const recording = recorder.status === "recording";
  const inputBusy = recorder.status !== "idle";
  return (
    <div className="space-y-6">
      {config.error && (
        <ErrorAlert
          title="Voice services could not be checked"
          message={config.error.message}
          onRetry={() => void config.reload()}
        />
      )}
      {config.data && !config.data.matching && (
        <p className="text-sm text-muted-foreground">
          Drafting is not available on this deployment yet, so briefs and
          developer suggestions cannot be generated.
        </p>
      )}
      {error && <ErrorAlert title="Please try again" message={error} />}
      {stage === "conversation" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section
            className="hiring-stage min-h-96 rounded-xl border"
            aria-label="Project voice intake"
            data-phase={recording ? "listening" : "ready"}
          >
            <Aurora
              moving={moving}
              speaking={false}
              microphone={recording ? microphone.level : undefined}
            />
            <Button
              variant="ghost"
              size="sm"
              aria-pressed={moving}
              onClick={() => setMoving(!moving)}
            >
              {moving ? "Pause atmosphere" : "Animate atmosphere"}
            </Button>
            <div className="voice-presence">
              <Waveform microphone={recording ? microphone.level : undefined} />
            </div>
            <p role="status" className="text-sm">
              {recording
                ? "Listening · stop when you finish"
                : recorder.status === "transcribing"
                  ? "Transcribing…"
                  : recorder.status === "requesting"
                    ? "Waiting for microphone permission…"
                    : "What would you like to build?"}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              {inputBusy ? (
                <>
                  <Button onClick={recording ? recorder.stop : recorder.cancel}>
                    {recording ? <SquareIcon aria-hidden="true" /> : null}
                    {recording ? "Stop and transcribe" : "Cancel"}
                  </Button>
                  {recording && (
                    <Button variant="outline" onClick={recorder.cancel}>
                      Discard recording
                    </Button>
                  )}
                </>
              ) : (
                <Button
                  onClick={() => void recorder.start()}
                  disabled={busy || !config.data?.transcription}
                >
                  <MicIcon aria-hidden="true" />
                  Record an answer
                </Button>
              )}
            </div>
            <p className="mt-4 max-w-sm text-center text-xs text-muted-foreground">
              Up to 60 seconds. Stopping sends audio for transcription. This app
              does not save recordings.
            </p>
            {config.data && !config.data.transcription && (
              <p className="mt-2 text-xs text-muted-foreground">
                Transcription is not available yet. You can type instead.
              </p>
            )}
            <p
              role="alert"
              className="mt-2 text-sm text-destructive-foreground"
            >
              {recorder.error || microphone.error}
            </p>
          </section>
          <Card>
            <CardPanel className="space-y-5 p-5 sm:p-6">
              <h2 className="text-lg font-semibold">Conversation</h2>
              <div
                ref={transcript}
                role="log"
                aria-label="Project intake conversation"
                aria-live="polite"
                className="max-h-72 space-y-5 overflow-y-auto"
              >
                {!messages.length && (
                  <p className="text-sm text-muted-foreground">
                    Describe the project, who it helps, and what you need a
                    developer to do.
                  </p>
                )}
                {messages.map((message, index) => (
                  <div key={index}>
                    <p className="text-xs font-medium text-muted-foreground">
                      {message.role === "user" ? "You" : "Assistant"}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6">
                      {message.content}
                    </p>
                  </div>
                ))}
              </div>
              <form
                onSubmit={(event) => void send(event)}
                className="space-y-3"
              >
                <Label htmlFor="hiring-answer">Your answer</Label>
                <Textarea
                  id="hiring-answer"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  maxLength={3000}
                  disabled={busy || inputBusy}
                  placeholder="I need a website for…"
                />
                <p className="text-xs text-muted-foreground">
                  Review the transcription before sending. Each answer refines
                  the drafted brief.
                </p>
                <Button
                  type="submit"
                  loading={busy}
                  disabled={
                    !draft.trim() || inputBusy || !config.data?.matching
                  }
                >
                  Draft the brief
                </Button>
              </form>
              <Button
                variant="outline"
                disabled={
                  busy || inputBusy || !brief.title || !brief.description
                }
                onClick={() => {
                  recorder.cancel();
                  setStage("review");
                }}
              >
                Review project brief
              </Button>
            </CardPanel>
          </Card>
        </div>
      )}
      {stage === "review" && (
        <Card>
          <CardPanel className="mx-auto max-w-3xl space-y-5 p-5 sm:p-8">
            <h2 className="text-xl font-semibold">Review your project brief</h2>
            <p className="text-sm text-muted-foreground">
              Unknown details can stay blank. This does not publish an
              opportunity.
            </p>
            <BriefForm
              brief={brief}
              pending={busy}
              disabled={false}
              submitDisabled={!config.data?.matching}
              onSubmit={(confirmed) => void findDevelopers(confirmed)}
            />
          </CardPanel>
        </Card>
      )}
      {stage === "results" && suggestions && (
        <section className="space-y-5" aria-labelledby="suggestions-title">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="suggestions-title" className="text-xl font-semibold">
              Suggested developers
            </h2>
            <Button variant="outline" onClick={() => setStage("review")}>
              Edit brief
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {suggestions.considered} available profiles considered. Suggestions
            are not hiring decisions; confirm practical details with each
            developer.
          </p>
          {!suggestions.developers.length && (
            <p>
              No suitable developers were found. You can adjust the brief and
              try again.
            </p>
          )}
          <ul className="grid gap-4 md:grid-cols-2">
            {suggestions.developers.map((match) => (
              <li key={match.developerId}>
                <Card className="h-full">
                  <CardPanel className="space-y-3 p-6">
                    <h3 className="text-lg font-semibold">
                      {match.profile.name}
                    </h3>
                    <p className="text-sm">{match.reason}</p>
                    <p className="text-sm text-muted-foreground">
                      {match.profile.city} · {match.profile.weeklyHours}{" "}
                      hours/week
                    </p>
                    {match.needsDiscussion.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium">To discuss</h4>
                        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                          {match.needsDiscussion.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardPanel>
                </Card>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">
            No invitations have been sent. Use your dashboard to post an
            opportunity and express interest.
          </p>
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                const saved = await createProjectDraft(
                  projectDraftFromBrief(brief),
                );
                router.push(`/projects/drafts/${saved.id}`);
              } catch (failure) {
                setError(
                  failure instanceof Error
                    ? failure.message
                    : "The project draft could not be saved.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            Post an opportunity
          </Button>
        </section>
      )}
      {(messages.length > 0 || draft) && (
        <ConfirmButton
          label="Start over"
          title="Clear this conversation?"
          description="Your draft and suggestions will be removed from this page. Nothing has been posted."
          confirmLabel="Clear conversation"
          variant="ghost"
          onConfirm={reset}
        />
      )}
    </div>
  );
}

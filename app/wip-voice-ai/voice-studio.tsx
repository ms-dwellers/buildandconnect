"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowUpIcon,
  ArrowUpRightIcon,
  CheckIcon,
  MicIcon,
  PauseIcon,
  PlayIcon,
  RotateCcwIcon,
  SquareIcon,
  Volume2Icon,
  VolumeXIcon,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Aurora } from "./aurora";
import { Waveform } from "./waveform";
import {
  formatDuration,
  greeting,
  isSessionActive,
  phaseLabel,
  replyFor,
  starters,
  voiceStyles,
  type DemoMessage,
  type VoicePhase,
} from "./demo";

const DEFAULT_VOICE = voiceStyles[0];
const DEFAULT_PACE = 35;

export function VoiceStudio() {
  const [phase, setPhase] = useState<VoicePhase>("ready");
  const [sound, setSound] = useState(false);
  const [moving, setMoving] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const [messages, setMessages] = useState<DemoMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [audioNote, setAudioNote] = useState("");
  const previousPhase = useRef<VoicePhase>("listening");
  const pendingReply = useRef(greeting);
  const soundRef = useRef(sound);
  const speakingAudio = useRef(false);
  const transcript = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);
  const active = isSessionActive(phase);
  const canReply =
    phase === "ready" || phase === "listening" || phase === "ended";

  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);
  useEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const changed = () => setMoving(!preference.matches);
    changed();
    preference.addEventListener("change", changed);
    return () => preference.removeEventListener("change", changed);
  }, []);
  useEffect(() => {
    if (!active || phase === "paused") return;
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [active, phase]);
  useEffect(() => {
    const element = transcript.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages, phase]);
  useEffect(
    () => () => {
      window.speechSynthesis?.cancel();
    },
    [],
  );

  const previewSpeech = useCallback((text: string) => {
    if (!soundRef.current) return false;
    const synthesizer = window.speechSynthesis;
    const localVoice = synthesizer
      ?.getVoices()
      .find((item) => item.localService && item.lang.startsWith("en"));
    if (!synthesizer || !localVoice) {
      setAudioNote(
        "No local device voice is available. The demo still works through text.",
      );
      return false;
    }
    synthesizer.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = localVoice;
    utterance.rate = DEFAULT_VOICE.rate;
    utterance.pitch = DEFAULT_VOICE.pitch;
    utterance.onend = () => {
      speakingAudio.current = false;
      setPhase((current) => (current === "speaking" ? "listening" : current));
    };
    utterance.onerror = () => {
      speakingAudio.current = false;
      setAudioNote(
        "The device voice stopped. You can keep going through text.",
      );
      setPhase((current) => (current === "speaking" ? "listening" : current));
    };
    synthesizer.speak(utterance);
    return true;
  }, []);

  useEffect(() => {
    if (phase === "connecting" || phase === "thinking") {
      const timer = setTimeout(
        () => {
          const text = pendingReply.current;
          setMessages((current) => [
            ...current,
            { id: nextId.current++, speaker: "guide", text },
          ]);
          setPhase("speaking");
          speakingAudio.current = previewSpeech(text);
        },
        phase === "connecting" ? 950 : 1100,
      );
      return () => clearTimeout(timer);
    }
    if (phase === "speaking") {
      if (speakingAudio.current) return;
      const timer = setTimeout(
        () => setPhase("listening"),
        6500 + (100 - DEFAULT_PACE) * 25,
      );
      return () => clearTimeout(timer);
    }
  }, [phase, previewSpeech]);

  function begin() {
    window.speechSynthesis?.cancel();
    nextId.current = 0;
    setMessages([]);
    setSeconds(0);
    pendingReply.current = greeting;
    setPhase("connecting");
  }
  function send(text: string) {
    if (!text.trim() || !canReply) return;
    if (!active) {
      setMessages([]);
      setSeconds(0);
    }
    setMessages((current) => [
      ...current,
      { id: nextId.current++, speaker: "you", text: text.trim() },
    ]);
    pendingReply.current = replyFor(text.trim());
    setDraft("");
    setPhase("thinking");
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    send(draft);
  }
  function pause() {
    if (phase === "paused") {
      setPhase(previousPhase.current);
      if (sound) window.speechSynthesis?.resume();
    } else {
      previousPhase.current = phase;
      setPhase("paused");
      window.speechSynthesis?.pause();
    }
  }
  function end() {
    speakingAudio.current = false;
    window.speechSynthesis?.cancel();
    setPhase("ended");
  }
  function reset() {
    speakingAudio.current = false;
    window.speechSynthesis?.cancel();
    setPhase("ready");
    setMessages([]);
    setSeconds(0);
    setDraft("");
    setAudioNote("");
  }
  function toggleSound() {
    if (sound) {
      window.speechSynthesis?.cancel();
      speakingAudio.current = false;
      setPhase((current) => (current === "speaking" ? "listening" : current));
    }
    setSound(!sound);
    soundRef.current = !sound;
    setAudioNote("");
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
          <Badge variant="outline">Local demo</Badge>
          <Button variant="ghost" render={<a href="/" />}>
            <ArrowLeftIcon aria-hidden="true" />
            Back home
          </Button>
        </div>
      </header>
      <main id="voice-main" tabIndex={-1} className="voice-main">
        <h1 className="sr-only">Think out loud.</h1>

        <div className="voice-workspace">
          <section
            className="voice-session"
            aria-label="Voice conversation preview"
          >
            <div className="voice-stage" data-phase={phase}>
              <Aurora
                moving={moving && phase !== "paused"}
                speaking={phase === "speaking"}
              />
              <div className="voice-stage-top">
                <span>
                  <span className="voice-live-dot" />
                  Voice preview
                </span>
                <div>
                  <span className="voice-timer" aria-label="Session duration">
                    {formatDuration(seconds)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={
                      moving ? "Pause atmosphere" : "Animate atmosphere"
                    }
                    aria-pressed={moving}
                    onClick={() => setMoving(!moving)}
                  >
                    {moving ? (
                      <PauseIcon aria-hidden="true" />
                    ) : (
                      <PlayIcon aria-hidden="true" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="voice-presence">
                <div className="voice-presence-caption">
                  <Waveform />
                  <p className="voice-phase" role="status">
                    {phaseLabel(phase)}
                  </p>
                </div>
              </div>

              <div className="voice-controls">
                <Button
                  variant="outline"
                  size="icon-xl"
                  aria-label={
                    sound ? "Mute voice preview" : "Enable voice preview"
                  }
                  aria-pressed={sound}
                  onClick={toggleSound}
                >
                  {sound ? (
                    <Volume2Icon aria-hidden="true" />
                  ) : (
                    <VolumeXIcon aria-hidden="true" />
                  )}
                </Button>
                {!active ? (
                  <Button size="xl" className="voice-start" onClick={begin}>
                    <MicIcon aria-hidden="true" />
                    {phase === "ended" ? "Start again" : "Begin conversation"}
                  </Button>
                ) : (
                  <Button
                    size="xl"
                    className="voice-start"
                    onClick={pause}
                    disabled={phase === "connecting"}
                  >
                    {phase === "paused" ? (
                      <PlayIcon aria-hidden="true" />
                    ) : (
                      <PauseIcon aria-hidden="true" />
                    )}
                    {phase === "connecting"
                      ? "Starting…"
                      : phase === "paused"
                        ? "Resume conversation"
                        : "Pause conversation"}
                  </Button>
                )}
                {active ? (
                  <Button
                    variant="outline"
                    size="icon-xl"
                    aria-label="End conversation"
                    onClick={end}
                  >
                    <SquareIcon aria-hidden="true" />
                  </Button>
                ) : (
                  <span className="voice-control-spacer" />
                )}
              </div>
              {audioNote && (
                <p className="voice-device-note" role="status">
                  {audioNote}
                </p>
              )}
            </div>
          </section>

          <section
            className="voice-conversation"
            aria-labelledby="conversation-title"
          >
            <div className="voice-conversation-heading">
              <div>
                <h2 id="conversation-title">Transcript</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Clear conversation"
                disabled={!messages.length && phase === "ready"}
                onClick={reset}
              >
                <RotateCcwIcon aria-hidden="true" />
              </Button>
            </div>
            <div
              className="voice-transcript"
              ref={transcript}
              role="log"
              aria-label="Demo conversation"
              aria-live="polite"
            >
              {messages.length === 0 ? (
                <div className="voice-empty">
                  <h3>No conversation yet</h3>
                  <p>Start a session or choose a prompt below.</p>
                </div>
              ) : (
                messages.map((message) => (
                  <article
                    key={message.id}
                    className={`voice-message voice-message-${message.speaker}`}
                  >
                    <span>{message.speaker === "you" ? "You" : "Voice"}</span>
                    <p>{message.text}</p>
                  </article>
                ))
              )}
              {phase === "thinking" && (
                <p className="voice-thinking">
                  Preparing a reply<span aria-hidden="true">…</span>
                </p>
              )}
              {phase === "ended" && (
                <div className="voice-ended">
                  <CheckIcon aria-hidden="true" />
                  Session ended.
                </div>
              )}
            </div>
            <div className="voice-starters">
              <h3>
                Try a prompt <ArrowDownIcon aria-hidden="true" />
              </h3>
              {starters.map((starter) => (
                <Button
                  key={starter.title}
                  variant="ghost"
                  className="voice-starter"
                  onClick={() => send(starter.text)}
                  disabled={!canReply}
                >
                  <span>{starter.title}</span>
                  <ArrowUpRightIcon aria-hidden="true" />
                </Button>
              ))}
            </div>
            <form className="voice-compose" onSubmit={submit}>
              <Label htmlFor="voice-thought" className="sr-only">
                Type a thought
              </Label>
              <Input
                id="voice-thought"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Or type a thought…"
                maxLength={600}
                disabled={!canReply}
                autoComplete="off"
              />
              <Button
                type="submit"
                size="icon"
                aria-label="Send thought"
                disabled={!canReply || !draft.trim()}
              >
                <ArrowUpIcon aria-hidden="true" />
              </Button>
            </form>
          </section>
        </div>

        <footer className="voice-footer">
          <span>
            <span className="voice-footer-dot" />
            Voice prototype
          </span>
          <p>Scripted replies · local voice preview</p>
        </footer>
      </main>
    </div>
  );
}

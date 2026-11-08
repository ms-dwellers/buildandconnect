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
  AudioLinesIcon,
  CheckIcon,
  MicIcon,
  MicOffIcon,
  LoaderCircleIcon,
  PauseIcon,
  PlayIcon,
  RotateCcwIcon,
  SquareIcon,
  Volume2Icon,
  VolumeXIcon,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Aurora } from "./aurora";
import { useMicrophone } from "./use-microphone";
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

export function VoiceStudio() {
  const [phase, setPhase] = useState<VoicePhase>("ready");
  const [voiceId, setVoiceId] = useState<string>("warm");
  const [pace, setPace] = useState(35);
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
  const microphone = useMicrophone();
  const resumeMicrophone = useRef(false);
  const micOn = microphone.status === "on";
  const micPending = microphone.status === "requesting";
  const voice =
    voiceStyles.find((item) => item.id === voiceId) ?? voiceStyles[0];
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

  const previewSpeech = useCallback(
    (text: string) => {
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
      utterance.rate = voice.rate + (pace - 35) / 200;
      utterance.pitch = voice.pitch;
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
    },
    [voice, pace],
  );

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
        6500 + (100 - pace) * 25,
      );
      return () => clearTimeout(timer);
    }
  }, [phase, pace, previewSpeech]);

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
      if (resumeMicrophone.current) {
        resumeMicrophone.current = false;
        void microphone.enable();
      }
    } else {
      resumeMicrophone.current = micOn || micPending;
      microphone.disable();
      previousPhase.current = phase;
      setPhase("paused");
      window.speechSynthesis?.pause();
    }
  }
  function end() {
    resumeMicrophone.current = false;
    microphone.disable();
    speakingAudio.current = false;
    window.speechSynthesis?.cancel();
    setPhase("ended");
  }
  function reset() {
    resumeMicrophone.current = false;
    microphone.disable();
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
    setAudioNote(
      !sound
        ? "Uses a local device voice when available. No voice service is connected."
        : "Voice preview is muted.",
    );
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
          <span className="text-sm text-muted-foreground">Local demo</span>
          <Button variant="ghost" render={<a href="/" />}>
            <ArrowLeftIcon aria-hidden="true" />
            Back home
          </Button>
        </div>
      </header>

      <main id="voice-main" tabIndex={-1} className="voice-main">
        <div className="voice-heading">
          <div>
            <h1>Think out loud.</h1>
          </div>
        </div>

        <div className="voice-workspace">
          <section
            className="voice-session"
            aria-label="Voice conversation preview"
          >
            <div className="voice-stage" data-phase={phase}>
              <Aurora
                moving={moving && phase !== "paused"}
                speaking={phase === "speaking"}
                microphone={micOn ? microphone.level : undefined}
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
                  <Waveform microphone={micOn ? microphone.level : undefined} />
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
              <div className="voice-mic-controls">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={phase === "paused"}
                  aria-pressed={micOn || micPending}
                  onClick={() => {
                    if (micOn || micPending) microphone.disable();
                    else void microphone.enable();
                  }}
                >
                  {micPending ? (
                    <LoaderCircleIcon aria-hidden="true" />
                  ) : micOn ? (
                    <MicOffIcon aria-hidden="true" />
                  ) : (
                    <MicIcon aria-hidden="true" />
                  )}
                  {micPending
                    ? "Cancel microphone request"
                    : micOn
                      ? "Turn microphone off"
                      : microphone.status === "error"
                        ? "Retry microphone"
                        : "Enable microphone"}
                </Button>
                <p role="status">
                  {micPending
                    ? "Waiting for microphone permission."
                    : micOn
                      ? "Microphone on · processed on this device"
                      : phase === "paused"
                        ? "Microphone off while paused."
                        : "Optional · reacts to your voice volume"}
                </p>
              </div>
              <p className="voice-mic-error" role="alert">
                {microphone.error}
              </p>
              <p className="voice-stage-footnote">
                Simulated conversation. Audio is never recorded or sent.
              </p>
            </div>

            <div className="voice-preferences">
              <div className="voice-setting">
                <Label id="voice-choice-label">
                  <AudioLinesIcon aria-hidden="true" />
                  Voice style
                </Label>
                <Select
                  value={voiceId}
                  onValueChange={(value) => value && setVoiceId(value)}
                  items={voiceStyles.map((item) => ({
                    value: item.id,
                    label: item.label,
                  }))}
                >
                  <SelectTrigger
                    aria-labelledby="voice-choice-label"
                    className="voice-select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectPopup>
                    {voiceStyles.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.label} · {item.description}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
                <p>{voice.description}</p>
              </div>
              <div className="voice-setting voice-pace">
                <div>
                  <Label id="voice-pace-label">Conversation pace</Label>
                  <span>
                    {pace < 25 ? "Slow" : pace > 65 ? "Natural" : "Unhurried"}
                  </span>
                </div>
                <Slider
                  aria-labelledby="voice-pace-label"
                  value={pace}
                  onValueChange={(value) =>
                    setPace(Array.isArray(value) ? value[0] : value)
                  }
                  min={0}
                  max={100}
                  step={5}
                />
                <div className="voice-range-labels">
                  <span>Take it slow</span>
                  <span>Keep it flowing</span>
                </div>
              </div>
              <p className="voice-device-note" role="status">
                {audioNote ||
                  "Sound is off. Enable the voice preview whenever you’re ready."}
              </p>
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
          <p>
            Scripted replies · microphone stays local · nothing recorded or sent
          </p>
        </footer>
      </main>
    </div>
  );
}

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  formatDuration,
  isSessionActive,
  phaseLabel,
} from "../app/wip-voice-ai/session.ts";

test("voice conversation exposes session states and readable durations", () => {
  assert.equal(isSessionActive("ready"), false);
  assert.equal(isSessionActive("ended"), false);
  for (const phase of [
    "connecting",
    "speaking",
    "listening",
    "thinking",
    "paused",
  ] as const) {
    assert.equal(isSessionActive(phase), true);
    assert.ok(phaseLabel(phase));
  }
  assert.equal(phaseLabel("speaking"), "Speaking");
  assert.equal(formatDuration(0), "00:00");
  assert.equal(formatDuration(75), "01:15");
});

test("navigation stays above the unframed voice panel, with the transcript below", () => {
  const source = readFileSync(
    new URL("../app/wip-voice-ai/voice-studio.tsx", import.meta.url),
    "utf8",
  );
  const css = readFileSync(
    new URL("../app/wip-voice-ai/voice.css", import.meta.url),
    "utf8",
  );
  const session = css.match(/\.voice-session\s*\{([^}]+)\}/)?.[1];
  assert.ok(session);
  assert.match(
    session,
    /min-height: calc\(100svh - var\(--voice-nav-height\)\)/,
  );
  assert.doesNotMatch(session, /border:|border-radius:|box-shadow:/);
  assert.ok(
    source.indexOf('className="voice-nav"') <
      source.indexOf('className="voice-session"'),
  );
  assert.ok(
    source.indexOf('className="voice-session"') <
      source.indexOf('className="voice-conversation"'),
  );
  assert.match(source, /<h1 className="sr-only">Think out loud\.<\/h1>/);
  assert.match(css, /\.voice-session \.voice-stage/);
  assert.match(css, /\.voice-session \.voice-presence/);
  assert.doesNotMatch(
    source + css,
    /voice-preferences|voice-choice-label|voice-pace-label|voice-mic-controls|voice-stage-footnote/,
  );
  assert.doesNotMatch(
    source,
    /Enable microphone|Simulated conversation|speechSynthesis|replyFor|Local demo|voice-stage-top|Waveform|voice-timer/,
  );
  assert.match(source, /useVoiceConversation/);
  assert.match(source, /initialBrief=\{brief\}/);
  assert.match(source, /<RollingText/);
  assert.match(source, /aria-atomic="true"/);
  assert.match(
    css,
    /@media \(prefers-reduced-motion: no-preference\)\s*\{\s*\.voice-reply/,
  );
  assert.match(css, /animation-delay: var\(--word-delay\)/);
  assert.match(source, /phase === "speaking" &&/);
  assert.match(source, /conversation\.interrupt\(\)/);
});

test("the interview agent ignores talk-over instead of interrupting automatically", () => {
  const source = readFileSync(
    new URL("../backend/hiring/interview-agent.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /"interruption"/);
  assert.match(source, /transcribe_on_disabled_interruptions: false/);
});

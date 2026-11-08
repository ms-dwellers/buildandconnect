import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  fallbackReply,
  formatDuration,
  isSessionActive,
  phaseLabel,
  replyFor,
  starters,
  voiceStyles,
} from "../app/wip-voice-ai/demo.ts";

test("voice prototype uses deterministic local replies", () => {
  for (const starter of starters)
    assert.equal(replyFor(starter.text), starter.reply);
  assert.equal(replyFor("A thought of my own"), fallbackReply);
  assert.equal(
    new Set(voiceStyles.map((voice) => voice.id)).size,
    voiceStyles.length,
  );
});

test("voice prototype exposes session states and readable durations", () => {
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

test("the voice panel is the unframed first viewport, with the transcript below", () => {
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
  assert.match(session, /min-height: 100svh/);
  assert.doesNotMatch(session, /border:|border-radius:|box-shadow:/);
  assert.ok(
    source.indexOf('className="voice-session"') <
      source.indexOf('className="voice-nav"'),
  );
  assert.ok(
    source.indexOf('className="voice-nav"') <
      source.indexOf('className="voice-conversation"'),
  );
  assert.match(source, /<h1 className="sr-only">Think out loud\.<\/h1>/);
  assert.match(css, /\.voice-session \.voice-stage/);
  assert.match(css, /\.voice-session \.voice-presence/);
});

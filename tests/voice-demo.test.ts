import assert from "node:assert/strict";
import test from "node:test";
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

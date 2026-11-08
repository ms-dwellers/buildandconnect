import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { formatDuration, phaseLabel } from "../app/voice/session.ts";

test("voice studio uses its permanent route and redirects the old WIP page", () => {
  const page = readFileSync(
    new URL("../app/voice/page.tsx", import.meta.url),
    "utf8",
  );
  const legacy = readFileSync(
    new URL("../app/wip-voice-ai/page.tsx", import.meta.url),
    "utf8",
  );
  const dashboard = readFileSync(
    new URL("../app/dashboard/page.tsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(page, /local-only|prototype|wip/i);
  assert.match(legacy, /permanentRedirect\("\/voice"\)/);
  assert.match(dashboard, /requester:\s*\{\s*href: "\/projects\/new"/);
  assert.doesNotMatch(dashboard, /wip-voice-ai/);
});

test("recorded voice turns expose explicit states and readable durations", () => {
  for (const phase of [
    "ready",
    "requesting",
    "recording",
    "stopping",
    "recorded",
    "transcribing",
    "speaking",
    "thinking",
    "complete",
  ] as const) {
    assert.ok(phaseLabel(phase));
  }
  assert.equal(phaseLabel("recorded"), "Recording ready to send");
  assert.equal(phaseLabel("complete"), "Your brief is ready to review");
  assert.equal(formatDuration(0), "00:00");
  assert.equal(formatDuration(75), "01:15");
});

test("navigation stays above the unframed voice panel, with the transcript below", () => {
  const source = readFileSync(
    new URL("../app/voice/voice-studio.tsx", import.meta.url),
    "utf8",
  );
  const css = readFileSync(
    new URL("../app/voice/voice.css", import.meta.url),
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
    /Simulated conversation|speechSynthesis|replyFor|Local demo|Waveform/,
  );
  assert.match(source, /useVoiceConversation/);
  assert.match(source, /projectDraftFromBrief\(brief\)/);
  assert.match(source, /<RollingText/);
  assert.match(source, /aria-atomic="true"/);
  assert.match(
    css,
    /@media \(prefers-reduced-motion: no-preference\)\s*\{\s*\.voice-reply/,
  );
  assert.match(css, /animation-delay: var\(--word-delay\)/);
  assert.match(source, /Send recording/);
  assert.match(source, /Stop recording/);
  assert.match(source, /speech\.stop/);
  assert.match(source, /readyForReview/);
  assert.match(source, /Fill out manually/);
  assert.match(source, /conversation\.prepareReview\(\)/);
});

test("manual review cancels pending turns and audio before allowing edits", () => {
  const hook = readFileSync(
    new URL("../app/voice/use-voice-conversation.ts", import.meta.url),
    "utf8",
  );
  const review = hook.match(/function prepareReview\(\) \{([^}]+)\}/)?.[1];
  assert.ok(review);
  assert.match(review, /cancelProcessing\(\)/);
  assert.match(review, /recorder\.cancel\(\)/);
  assert.match(review, /speech\.stop\(\)/);
  assert.doesNotMatch(
    hook,
    /@elevenlabs\/client|startSession|voice-session|\/hiring\/extract/,
  );
  assert.match(hook, /\/hiring\/turn/);
  const intake = readFileSync(
    new URL("../components/hiring/employer-intake.tsx", import.meta.url),
    "utf8",
  );
  assert.match(intake, /disabled=\{false\}/);
  assert.match(intake, /submitDisabled=\{!config\.data\?\.matching\}/);
});

test("the interview agent ignores talk-over instead of interrupting automatically", () => {
  const source = readFileSync(
    new URL("../backend/hiring/interview-agent.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /"interruption"/);
  assert.match(source, /transcribe_on_disabled_interruptions: false/);
});

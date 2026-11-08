import assert from "node:assert/strict";
import test from "node:test";
import { microphoneLevel } from "../app/voice/microphone-level.ts";

const signal = (amplitude: number) =>
  Float32Array.from(
    { length: 1024 },
    (_, index) => Math.sin((index * Math.PI) / 16) * amplitude,
  );

test("microphone animation ignores silence and DC offset", () => {
  assert.equal(microphoneLevel(signal(0), 0, 100), 0);
  assert.equal(microphoneLevel(signal(0.001), 0, 100), 0);
  assert.equal(microphoneLevel(new Float32Array(1024).fill(0.3), 0, 100), 0);
  assert.equal(microphoneLevel(new Float32Array(), 0, 100), 0);
});

test("microphone animation follows volume with quick attack and slower release", () => {
  const quiet = microphoneLevel(signal(0.02), 0, 50);
  const loud = microphoneLevel(signal(0.3), 0, 50);
  assert.ok(loud > quiet && quiet > 0);
  const peak = microphoneLevel(signal(1), 0, 250);
  assert.ok(peak > 0.99 && peak <= 1);
  const decayed = microphoneLevel(signal(0), peak, 50);
  assert.ok(decayed > 0 && decayed < peak);
  assert.ok(loud > peak - decayed, "attack must be faster than release");
  let settled = peak;
  for (let i = 0; i < 20; i++)
    settled = microphoneLevel(signal(0), settled, 50);
  assert.ok(settled < 0.02);
});

test("microphone smoothing is time-based rather than frame-based", () => {
  const samples = signal(0.2);
  const single = microphoneLevel(samples, 0, 50);
  let multiple = 0;
  for (let i = 0; i < 5; i++) multiple = microphoneLevel(samples, multiple, 10);
  assert.ok(Math.abs(single - multiple) < 0.00001);
});

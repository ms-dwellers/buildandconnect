import assert from "node:assert/strict";
import test from "node:test";
import { microphoneMotionRate } from "../app/voice/voice-motion.ts";

test("microphone motion drifts in silence and accelerates with speech", () => {
  assert.equal(microphoneMotionRate(0), 0.25);
  assert.equal(microphoneMotionRate(1), 4);
  const rates = [0, 0.1, 0.3, 0.6, 1].map(microphoneMotionRate);
  for (let index = 1; index < rates.length; index++) {
    assert.ok(rates[index] > rates[index - 1]);
  }
});

test("microphone motion clamps invalid or out-of-range volume", () => {
  assert.equal(microphoneMotionRate(-1), 0.25);
  assert.equal(microphoneMotionRate(2), 4);
  assert.equal(microphoneMotionRate(NaN), 0.25);
  assert.equal(microphoneMotionRate(Infinity), 0.25);
});

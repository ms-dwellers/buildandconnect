import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { firstGifFrame } from "../scripts/mascot-stills.mjs";
import { MASCOT_FEEDBACK, MASCOT_REACTION_MS } from "../lib/mascot-feedback.ts";

test("every supplied mascot has a reproducible static first frame", () => {
  for (const pose of ["Base", "Happy", "Crying", "Running"]) {
    const source = readFileSync(
      new URL(
        `../public/assets/mascots/Mascot_${pose}_1000.gif`,
        import.meta.url,
      ),
    );
    const still = readFileSync(
      new URL(
        `../public/assets/mascots/still/${pose.toLowerCase()}.gif`,
        import.meta.url,
      ),
    );
    assert.deepEqual(firstGifFrame(source), still);
    const loopExtension = source.indexOf("NETSCAPE2.0");
    assert.ok(
      loopExtension >= 0,
      `${pose} must carry native GIF loop metadata`,
    );
    assert.equal(
      source.readUInt16LE(loopExtension + 13),
      0,
      `${pose} must loop until the UI stops it`,
    );
    assert.equal(still.toString("ascii", 0, 6), "GIF89a");
    assert.equal(still.readUInt16LE(6), 160);
    assert.equal(still.readUInt16LE(8), 160);
    assert.equal(still.at(-1), 0x3b);
    assert.ok(still.length < source.length);
  }
});

test("static-frame extraction rejects incomplete and non-GIF inputs", () => {
  assert.throws(() => firstGifFrame(Buffer.from("not a GIF")));
  assert.throws(() => firstGifFrame(Buffer.from("GIF89a")));
  const source = readFileSync(
    new URL("../public/assets/mascots/Mascot_Base_1000.gif", import.meta.url),
  );
  assert.throws(() => firstGifFrame(source.subarray(0, 30)));
});

test("feedback maps each app state to the supplied pose and motion", () => {
  assert.deepEqual(MASCOT_FEEDBACK, {
    idle: { pose: "base", motion: "loop" },
    loading: { pose: "running", motion: "loop" },
    success: { pose: "happy", motion: "once" },
    error: { pose: "crying", motion: "once" },
  });
  assert.equal(MASCOT_REACTION_MS, 4000);
  assert.ok(MASCOT_REACTION_MS <= 5000);
});

test("mascot motion has static reduced-motion fallback and bounded reactions", () => {
  const component = readFileSync(
    new URL("../components/mascot.tsx", import.meta.url),
    "utf8",
  );
  assert.match(component, /prefers-reduced-motion: reduce/);
  assert.match(component, /motion === "once"/);
  assert.match(component, /MASCOT_REACTION_MS/);
  assert.match(component, /enabled && playing/);
  assert.match(component, /clearTimeout/);
  assert.match(component, /aria-hidden="true"/);
});

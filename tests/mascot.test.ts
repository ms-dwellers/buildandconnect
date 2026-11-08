import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { firstGifFrame } from "../scripts/mascot-stills.mjs";

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

test("mascot motion has a static reduced-motion source and a bounded greeting", () => {
  const component = readFileSync(
    new URL("../components/mascot.tsx", import.meta.url),
    "utf8",
  );
  assert.match(component, /prefers-reduced-motion: reduce/);
  assert.match(component, /setTimeout\(\(\) => setPlaying\(false\), 4000\)/);
  assert.match(component, /clearTimeout/);
  assert.match(component, /aria-hidden="true"/);
});

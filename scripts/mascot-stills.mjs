import { readFile, writeFile, mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

// Keep the supplied GIF's palette and transparency, but only its first frame.
export function firstGifFrame(data) {
  if (!/^GIF8[79]a$/.test(data.toString("ascii", 0, 6)))
    throw new Error("Expected a GIF asset");
  const paletteSize = data[10] & 0x80 ? 3 * 2 ** ((data[10] & 7) + 1) : 0;
  let offset = 13 + paletteSize;
  const blocks = [data.subarray(0, offset)];
  const skipSubBlocks = () => {
    while (offset < data.length) {
      const size = data[offset++];
      if (!size) return;
      offset += size;
    }
    throw new Error("Incomplete GIF data");
  };
  while (offset < data.length) {
    const start = offset;
    const marker = data[offset++];
    if (marker === 0x21) {
      const label = data[offset++];
      skipSubBlocks();
      if (label === 0xf9) blocks.push(data.subarray(start, offset));
    } else if (marker === 0x2c) {
      const packed = data[offset + 8];
      offset += 9;
      if (packed & 0x80) offset += 3 * 2 ** ((packed & 7) + 1);
      offset++;
      skipSubBlocks();
      if (offset > data.length) throw new Error("Incomplete GIF frame");
      blocks.push(data.subarray(start, offset), Buffer.from([0x3b]));
      return Buffer.concat(blocks);
    } else {
      throw new Error("GIF has no complete image frame");
    }
  }
  throw new Error("GIF has no image frame");
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const directory = new URL("../public/assets/mascots/", import.meta.url);
  await mkdir(new URL("still/", directory), { recursive: true });
  for (const pose of ["Base", "Happy", "Crying", "Running"]) {
    const source = await readFile(
      new URL(`Mascot_${pose}_1000.gif`, directory),
    );
    await writeFile(
      new URL(`still/${pose.toLowerCase()}.gif`, directory),
      firstGifFrame(source),
    );
  }
}

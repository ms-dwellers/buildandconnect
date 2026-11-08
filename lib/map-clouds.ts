const sprites = [
  { name: "cloud-1", width: 171, height: 136 },
  { name: "cloud-2", width: 249, height: 120 },
  { name: "cloud-3", width: 299, height: 196 },
  { name: "foreground-cloud-1", width: 151, height: 114 },
  { name: "foreground-cloud-2", width: 172, height: 82 },
  { name: "foreground-cloud-3", width: 240, height: 128 },
] as const;

function noise(seed: number) {
  let value = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b);
  value = Math.imul(value ^ (value >>> 16), 0xc2b2ae35);
  return ((value ^ (value >>> 16)) >>> 0) / 0x100000000;
}

// One cloud per cell keeps coverage even; seeded jitter is stable across hydration.
export const mapClouds = Array.from({ length: 56 }, (_, index) => ({
  id: index,
  sprite: sprites[Math.floor(noise(index * 5 + 1) * sprites.length)],
  depth: (["far", "middle", "near"] as const)[index % 3],
  offsetX: 25 + noise(index * 5 + 2) * 50,
  offsetY: 25 + noise(index * 5 + 3) * 50,
  scale: 0.8 + noise(index * 5 + 4) * 0.4,
  travelY: (noise(index * 5 + 5) - 0.5) * 60,
  reflected: noise(index * 5 + 6) > 0.5,
}));

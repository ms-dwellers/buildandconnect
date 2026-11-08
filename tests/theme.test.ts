import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const stylesheet = readFileSync(
  new URL("../app/globals.css", import.meta.url),
  "utf8",
);
const root = stylesheet.match(/:root\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
const developerBlock =
  stylesheet.match(
    /\[data-theme="developer"\],\s*\[data-theme-preview="developer"\]\s*\{([\s\S]*?)\n\}/,
  )?.[1] ?? "";

function parseTokens(block: string) {
  return new Map(
    [...block.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((match) => [
      match[1],
      match[2].trim(),
    ]),
  );
}

const communityTokens = parseTokens(root);
const developerTokens = new Map(communityTokens);
for (const [key, value] of parseTokens(developerBlock)) {
  developerTokens.set(key, value);
}

function makeColor(tokens: Map<string, string>) {
  return function color(value: string): string {
    const token = value.match(/^var\((--[\w-]+)\)$/)?.[1];
    if (!token) return value;
    const result = tokens.get(token);
    assert.ok(result, `Missing token: ${token}`);
    return color(result);
  };
}

function luminance(hex: string): number {
  assert.match(hex, /^#[\da-f]{6}$/i);
  const channels = hex
    .slice(1)
    .match(/../g)!
    .map((channel) => {
      const value = Number.parseInt(channel, 16) / 255;
      return value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4;
    });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function makeContrast(tokens: Map<string, string>) {
  const color = makeColor(tokens);
  return function contrast(foreground: string, background: string): number {
    const values = [luminance(color(foreground)), luminance(color(background))];
    return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05);
  };
}

const communityColor = makeColor(communityTokens);
const communityContrast = makeContrast(communityTokens);

test("theme preserves all five supplied reference colors", () => {
  assert.equal(communityTokens.get("--palette-emerald"), "#1e6348");
  assert.equal(communityTokens.get("--palette-cream"), "#f8f7de");
  assert.equal(communityTokens.get("--palette-wheat"), "#f6dfb3");
  assert.equal(communityTokens.get("--palette-apricot"), "#f0a345");
  assert.equal(communityTokens.get("--palette-coral"), "#eb5757");
});

test("theme pairs a white page with green scenery and original warm accents", () => {
  assert.equal(communityTokens.get("--palette-mint"), "#cce0d9");
  assert.equal(communityTokens.get("--palette-teal"), "#8fb3ac");
  assert.equal(communityTokens.get("--palette-white"), "#ffffff");
  assert.equal(communityTokens.get("--background"), "var(--palette-white)");
  assert.equal(communityTokens.get("--secondary"), "var(--palette-mint)");
  assert.equal(communityTokens.get("--card"), "var(--palette-white)");
  assert.equal(
    communityTokens.get("--primary-foreground"),
    "var(--palette-cream)",
  );
  assert.equal(communityTokens.get("--highlight"), "var(--palette-coral)");
  assert.equal(
    communityTokens.get("--illustration-sun"),
    "var(--palette-apricot)",
  );
  assert.equal(communityTokens.get("--sidebar"), "var(--secondary)");
});

test("developer theme remaps to the warm fire kit", () => {
  assert.ok(developerBlock.length > 0, "Developer theme block missing");
  assert.equal(developerTokens.get("--primary"), "var(--palette-apricot)");
  assert.equal(developerTokens.get("--secondary"), "#5e3218");
  assert.equal(developerTokens.get("--highlight"), "var(--palette-coral)");
  assert.equal(developerTokens.get("--background"), "#4a2816");
  assert.equal(developerTokens.get("--ring"), "var(--palette-flame)");
  assert.equal(developerTokens.get("--input"), "var(--palette-flame)");
  assert.equal(developerTokens.get("--foreground"), "#ffe8cc");
});

test("selected font families are self-hosted with swap and licenses", () => {
  assert.match(
    communityTokens.get("--app-font-display") ?? "",
    /^"League Spartan"/,
  );
  assert.match(
    communityTokens.get("--app-font-sans") ?? "",
    /^"League Spartan"/,
  );
  assert.match(communityTokens.get("--app-font-mono") ?? "", /^"DM Mono"/);

  const faces = [...stylesheet.matchAll(/@font-face\s*\{([^}]+)\}/g)];
  assert.equal(faces.length, 8);
  for (const [, face] of faces) {
    assert.match(face, /font-display:\s*swap/);
    const path = face.match(/url\("(\/fonts\/[^\"]+\.ttf)"\)/)?.[1];
    assert.ok(path, "Font must use a local asset");
    const font = readFileSync(new URL(`../public${path}`, import.meta.url));
    assert.equal(font.readUInt32BE(0), 0x00010000, "Valid TrueType font");
  }
  for (const family of ["space-mono", "league-spartan", "dm-mono"]) {
    const license = readFileSync(
      new URL(`../public/fonts/${family}-OFL.txt`, import.meta.url),
      "utf8",
    );
    assert.match(license, /SIL OPEN FONT LICENSE/);
  }
});

test("theme text pairings meet WCAG AA normal-text contrast", () => {
  const pairs = [
    ["var(--foreground)", "var(--background)"],
    ["var(--muted-foreground)", "var(--background)"],
    ["var(--muted-foreground)", "var(--card)"],
    ["var(--card-foreground)", "var(--card)"],
    ["var(--card-foreground)", "var(--dashboard-paper)"],
    ["var(--muted-foreground)", "var(--dashboard-paper)"],
    ["var(--primary-foreground)", "var(--primary)"],
    ["var(--primary-foreground)", "var(--button-primary-hover)"],
    ["var(--secondary-foreground)", "var(--secondary)"],
    ["var(--muted-foreground)", "var(--secondary)"],
    ["var(--highlight-foreground)", "var(--highlight)"],
    ["var(--highlight-foreground)", "var(--button-highlight-hover)"],
    ["var(--foreground)", "var(--map-water)"],
    ["var(--map-label)", "var(--map-base)"],
    ["var(--foreground)", "var(--map-community)"],
    ["var(--accent-foreground)", "var(--accent)"],
    ["var(--success-foreground)", "var(--background)"],
    ["var(--info-foreground)", "var(--background)"],
    ["var(--warning-foreground)", "var(--background)"],
    ["var(--muted-foreground)", "var(--muted)"],
    ["var(--foreground)", "var(--accent)"],
    ["var(--destructive-foreground)", "var(--background)"],
    ["#ffffff", "var(--destructive)"],
  ];
  for (const [foreground, background] of pairs) {
    const ratio = communityContrast(foreground, background);
    assert.ok(
      ratio >= 4.5,
      `${foreground} on ${background}: ${ratio.toFixed(2)}:1`,
    );
  }
});

test("developer theme text pairings meet WCAG AA normal-text contrast", () => {
  const contrast = makeContrast(developerTokens);
  const pairs = [
    ["var(--foreground)", "var(--background)"],
    ["var(--muted-foreground)", "var(--background)"],
    ["var(--muted-foreground)", "var(--card)"],
    ["var(--card-foreground)", "var(--card)"],
    ["var(--primary-foreground)", "var(--primary)"],
    ["var(--primary-foreground)", "var(--button-primary-hover)"],
    ["var(--secondary-foreground)", "var(--secondary)"],
    ["var(--muted-foreground)", "var(--secondary)"],
    ["var(--highlight-foreground)", "var(--highlight)"],
    ["var(--highlight-foreground)", "var(--button-highlight-hover)"],
    ["var(--accent-foreground)", "var(--accent)"],
    ["var(--destructive-foreground)", "var(--background)"],
    ["#ffffff", "var(--destructive)"],
  ];
  for (const [foreground, background] of pairs) {
    const ratio = contrast(foreground, background);
    assert.ok(
      ratio >= 4.5,
      `developer: ${foreground} on ${background}: ${ratio.toFixed(2)}:1`,
    );
  }
});

test("focus and input tokens remain visible against light surfaces", () => {
  for (const background of [
    "var(--background)",
    "var(--card)",
    "var(--secondary)",
    "var(--dashboard-paper)",
  ]) {
    for (const foreground of ["var(--ring)", "var(--input)"]) {
      const ratio = communityContrast(foreground, background);
      assert.ok(
        ratio >= 3,
        `${foreground} on ${background}: ${ratio.toFixed(2)}:1`,
      );
    }
  }
});

test("developer focus and input tokens remain visible against light surfaces", () => {
  const contrast = makeContrast(developerTokens);
  for (const background of [
    "var(--background)",
    "var(--card)",
    "var(--secondary)",
  ]) {
    for (const foreground of ["var(--ring)", "var(--input)"]) {
      const ratio = contrast(foreground, background);
      assert.ok(
        ratio >= 3,
        `developer: ${foreground} on ${background}: ${ratio.toFixed(2)}:1`,
      );
    }
  }
});

test("the landing scene reads only tokens that resolve to hex colours", () => {
  const sceneTokens = new Set(
    [...root.matchAll(/(--scene-[\w-]+):/g)].map((match) => match[1]),
  );
  assert.ok(sceneTokens.size >= 8, "scene tokens are defined in :root");
  assert.equal(communityTokens.get("--scene-fabric"), "var(--palette-pine)");
  assert.equal(communityTokens.get("--scene-cushion"), "var(--palette-wheat)");
  for (const name of [
    ...sceneTokens,
    "--background",
    "--primary",
    "--palette-pine",
    "--palette-mint",
    "--palette-wheat",
    "--palette-apricot",
    "--palette-coral",
  ])
    assert.match(communityColor(`var(${name})`), /^#[\da-f]{6}$/i, name);
});

test("component discovery uses the coss registry", () => {
  const config = JSON.parse(
    readFileSync(new URL("../components.json", import.meta.url), "utf8"),
  );
  assert.equal(config.registries["@coss"], "https://coss.com/ui/r/{name}.json");
  assert.equal(config.aliases.ui, "@/components/ui");
});

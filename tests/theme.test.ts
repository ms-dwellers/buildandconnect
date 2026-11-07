import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const stylesheet = readFileSync(
  new URL("../app/globals.css", import.meta.url),
  "utf8",
);
const root = stylesheet.match(/:root\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
const tokens = new Map(
  [...root.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((match) => [
    match[1],
    match[2].trim(),
  ]),
);

function color(value: string): string {
  const token = value.match(/^var\((--[\w-]+)\)$/)?.[1];
  if (!token) return value;
  const result = tokens.get(token);
  assert.ok(result, `Missing token: ${token}`);
  return color(result);
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

function contrast(foreground: string, background: string): number {
  const values = [luminance(color(foreground)), luminance(color(background))];
  return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05);
}

test("theme preserves all five supplied reference colors", () => {
  assert.equal(tokens.get("--palette-emerald"), "#1e6348");
  assert.equal(tokens.get("--palette-cream"), "#f8f7de");
  assert.equal(tokens.get("--palette-wheat"), "#f6dfb3");
  assert.equal(tokens.get("--palette-apricot"), "#f0a345");
  assert.equal(tokens.get("--palette-coral"), "#eb5757");
});

test("theme text pairings meet WCAG AA normal-text contrast", () => {
  const pairs = [
    ["var(--foreground)", "var(--background)"],
    ["var(--muted-foreground)", "var(--background)"],
    ["var(--muted-foreground)", "var(--card)"],
    ["var(--card-foreground)", "var(--card)"],
    ["var(--primary-foreground)", "var(--primary)"],
    ["var(--secondary-foreground)", "var(--secondary)"],
    ["var(--accent-foreground)", "var(--accent)"],
    ["var(--destructive-foreground)", "var(--background)"],
    ["#ffffff", "var(--destructive)"],
  ];
  for (const [foreground, background] of pairs) {
    const ratio = contrast(foreground, background);
    assert.ok(
      ratio >= 4.5,
      `${foreground} on ${background}: ${ratio.toFixed(2)}:1`,
    );
  }
});

test("focus and input tokens remain visible against light surfaces", () => {
  for (const background of [
    "var(--background)",
    "var(--card)",
    "var(--secondary)",
  ]) {
    for (const foreground of ["var(--ring)", "var(--input)"]) {
      const ratio = contrast(foreground, background);
      assert.ok(
        ratio >= 3,
        `${foreground} on ${background}: ${ratio.toFixed(2)}:1`,
      );
    }
  }
});

test("component discovery uses the coss registry", () => {
  const config = JSON.parse(
    readFileSync(new URL("../components.json", import.meta.url), "utf8"),
  );
  assert.equal(config.registries["@coss"], "https://coss.com/ui/r/{name}.json");
  assert.equal(config.aliases.ui, "@/components/ui");
});

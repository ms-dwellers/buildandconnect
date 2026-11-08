#!/usr/bin/env node
/**
 * Attempts to push Community / Developer color variables into a Figma file.
 * Needs FIGMA_ACCESS_TOKEN + FIGMA_FILE_KEY in .env.local and Enterprise write access.
 * Never logs secret values.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return {};
  const env = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    env[trimmed.slice(0, index)] = trimmed.slice(index + 1);
  }
  return env;
}

const env = { ...loadEnvLocal(), ...process.env };
const token = env.FIGMA_ACCESS_TOKEN?.trim();
const fileKey = env.FIGMA_FILE_KEY?.trim();

if (!token) {
  console.error("Missing FIGMA_ACCESS_TOKEN in .env.local");
  process.exit(1);
}
if (!fileKey) {
  console.error(
    "Missing FIGMA_FILE_KEY. Create the Figma file in the UI, then set the key in .env.local.",
  );
  process.exit(1);
}

const headers = {
  "X-Figma-Token": token,
  "Content-Type": "application/json",
};

const me = await fetch("https://api.figma.com/v1/me", { headers });
if (!me.ok) {
  console.error("Token check failed:", me.status);
  process.exit(1);
}
const profile = await me.json();
console.log("Authenticated as", profile.handle ?? profile.id);

const file = await fetch(`https://api.figma.com/v1/files/${fileKey}?depth=1`, {
  headers,
});
if (!file.ok) {
  console.error("File read failed:", file.status, await file.text());
  process.exit(1);
}
const fileJson = await file.json();
console.log("File:", fileJson.name);

const body = {
  variableCollections: [
    {
      action: "CREATE",
      id: "collection-theme",
      name: "Build and Connect Theme",
      initialModeId: "mode-community",
    },
  ],
  variableModes: [
    {
      action: "CREATE",
      id: "mode-community",
      name: "Community",
      variableCollectionId: "collection-theme",
    },
    {
      action: "CREATE",
      id: "mode-developer",
      name: "Developer",
      variableCollectionId: "collection-theme",
    },
  ],
  variables: [
    {
      action: "CREATE",
      id: "var-primary",
      name: "color/primary",
      variableCollectionId: "collection-theme",
      resolvedType: "COLOR",
    },
    {
      action: "CREATE",
      id: "var-secondary",
      name: "color/secondary",
      variableCollectionId: "collection-theme",
      resolvedType: "COLOR",
    },
    {
      action: "CREATE",
      id: "var-highlight",
      name: "color/highlight",
      variableCollectionId: "collection-theme",
      resolvedType: "COLOR",
    },
    {
      action: "CREATE",
      id: "var-background",
      name: "color/background",
      variableCollectionId: "collection-theme",
      resolvedType: "COLOR",
    },
    {
      action: "CREATE",
      id: "var-foreground",
      name: "color/foreground",
      variableCollectionId: "collection-theme",
      resolvedType: "COLOR",
    },
  ],
  variableModeValues: [
    {
      variableId: "var-primary",
      modeId: "mode-community",
      value: { r: 23 / 255, g: 76 / 255, b: 67 / 255, a: 1 },
    },
    {
      variableId: "var-secondary",
      modeId: "mode-community",
      value: { r: 204 / 255, g: 224 / 255, b: 217 / 255, a: 1 },
    },
    {
      variableId: "var-highlight",
      modeId: "mode-community",
      value: { r: 235 / 255, g: 87 / 255, b: 87 / 255, a: 1 },
    },
    {
      variableId: "var-background",
      modeId: "mode-community",
      value: { r: 248 / 255, g: 247 / 255, b: 222 / 255, a: 1 },
    },
    {
      variableId: "var-foreground",
      modeId: "mode-community",
      value: { r: 18 / 255, g: 61 / 255, b: 55 / 255, a: 1 },
    },
    {
      variableId: "var-primary",
      modeId: "mode-developer",
      value: { r: 240 / 255, g: 163 / 255, b: 69 / 255, a: 1 },
    },
    {
      variableId: "var-secondary",
      modeId: "mode-developer",
      value: { r: 94 / 255, g: 50 / 255, b: 24 / 255, a: 1 },
    },
    {
      variableId: "var-highlight",
      modeId: "mode-developer",
      value: { r: 235 / 255, g: 87 / 255, b: 87 / 255, a: 1 },
    },
    {
      variableId: "var-background",
      modeId: "mode-developer",
      value: { r: 74 / 255, g: 40 / 255, b: 22 / 255, a: 1 },
    },
    {
      variableId: "var-foreground",
      modeId: "mode-developer",
      value: { r: 255 / 255, g: 232 / 255, b: 204 / 255, a: 1 },
    },
  ],
};

const sync = await fetch(
  `https://api.figma.com/v1/files/${fileKey}/variables`,
  {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  },
);
const text = await sync.text();
if (!sync.ok) {
  console.error(
    "Variables sync failed (",
    sync.status,
    "). Use Tokens Studio import from tokens.json instead.",
  );
  console.error(text.slice(0, 500));
  process.exit(2);
}
console.log("Variables synced.");
console.log(text.slice(0, 500));

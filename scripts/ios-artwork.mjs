import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CommunityGarden } from "../components/landing/community-garden.tsx";

const css = readFileSync("app/globals.css", "utf8");
const root = css.slice(css.indexOf(":root {"), css.indexOf(".voice-studio"));
const tokens = Object.fromEntries(
  [...root.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((match) => [
    match[1],
    match[2].trim(),
  ]),
);
function resolve(name, depth = 0) {
  if (depth > 10 || !tokens[name])
    throw new Error(`Unresolved illustration token: ${name}`);
  return tokens[name].replace(/var\((--[\w-]+)\)/g, (_, reference) =>
    resolve(reference, depth + 1),
  );
}
const svg = renderToStaticMarkup(createElement(CommunityGarden))
  .replace(
    "<svg",
    '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="504"',
  )
  .replace(/class="([^"]*)"/g, (_, classes) => {
    const declarations = [];
    for (const name of classes.split(" ")) {
      const match = /^(fill|stroke|text)-([\w-]+)(?:\/(\d+))?$/.exec(name);
      if (!match) continue;
      const property = match[1] === "text" ? "color" : match[1];
      declarations.push(`${property}:${resolve("--" + match[2])}`);
      if (match[3])
        declarations.push(`${property}-opacity:${Number(match[3]) / 100}`);
    }
    return declarations.length ? `style="${declarations.join(";")}"` : "";
  });
mkdirSync(".tools", { recursive: true });
writeFileSync(".tools/ios-garden.svg", svg);
for (const [source, destination] of [
  [
    ".tools/ios-garden.svg",
    "ios/Resources/Assets.xcassets/CommunityGarden.imageset/CommunityGarden.png",
  ],
  [
    "ios/Artwork/AppIcon.svg",
    "ios/Resources/Assets.xcassets/AppIcon.appiconset/AppIcon.png",
  ],
]) {
  const result = spawnSync("resvg", [source, destination], {
    stdio: "inherit",
  });
  if (result.error)
    throw new Error("Install resvg to regenerate native artwork.");
  if (result.status !== 0) process.exit(result.status ?? 1);
}

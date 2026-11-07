import { existsSync, readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

const manifest = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);
export const tasks = [
  "setup",
  ...Object.keys(manifest.scripts).filter((name) => name !== "deploy"),
];

export function runtimeError(version) {
  const range = manifest.engines.node.match(/^>=(\d+)\.(\d+)\.(\d+) <(\d+)$/);
  if (!range)
    throw new Error("Update the development runtime check for the Node range.");
  const minimum = range.slice(1, 4).map(Number);
  const actual = version.replace(/^v/, "").split(".").map(Number);
  const tooOld = actual.some(
    (part, index) =>
      part < minimum[index] &&
      actual
        .slice(0, index)
        .every((prefix, position) => prefix === minimum[position]),
  );
  if (
    actual.length !== 3 ||
    actual.some(Number.isNaN) ||
    tooOld ||
    actual[0] >= Number(range[4])
  ) {
    return `Node.js ${manifest.engines.node} is required; found ${version}. See docs/development.md.`;
  }
  return undefined;
}

export function taskError(task, installed) {
  if (!tasks.includes(task)) {
    return `Unknown development task: ${task}. Run scripts/dev.sh --help or scripts/dev.ps1 --help.`;
  }
  if (task !== "setup" && !installed) {
    return "Dependencies are missing. Run scripts/dev.sh setup or scripts/dev.ps1 setup first.";
  }
  return undefined;
}

export function bunVersionError(version) {
  const required = manifest.packageManager.split("@")[1];
  const minimum = required.split(".").map(Number);
  const actual = /^v?(\d+)\.(\d+)\.(\d+)$/
    .exec(version ?? "")
    ?.slice(1)
    .map(Number);
  if (
    !actual ||
    actual[0] !== minimum[0] ||
    actual[1] !== minimum[1] ||
    actual[2] < minimum[2]
  ) {
    return `Bun ${manifest.engines.bun} is required; found ${version || "no version"}. See docs/development.md.`;
  }
  return undefined;
}

if (
  process.argv[1] &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
) {
  const task = process.argv[2] ?? "dev";
  if (["help", "--help", "-h"].includes(task)) {
    console.log(`Usage: scripts/dev.sh [task] [arguments...]
       scripts/dev.ps1 [task] [arguments...]

Tasks: ${tasks.join(", ")}
Default: dev. Setup installs locked Bun dependencies, not system tools.
Arguments are forwarded unchanged to Bun. Deploy separately with bun run deploy.`);
  } else {
    const error =
      runtimeError(process.versions.node) ??
      bunVersionError(process.argv[3]) ??
      taskError(
        task,
        existsSync(
          new URL("../node_modules/vite/package.json", import.meta.url),
        ),
      );
    if (error) {
      console.error(error);
      process.exitCode = 1;
    }
  }
}

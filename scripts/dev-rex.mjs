import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
const label = "build-and-connect";

function rex(args) {
  const result = spawnSync("rex", args, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(
      result.error?.code === "ENOENT"
        ? "Install and connect Rex before running dev:rex."
        : result.stderr.trim() || "Rex command failed.",
    );
  }
  return JSON.parse(result.stdout);
}

export function agentCommand(env) {
  const commands = env.BANDC_AGENT
    ? [env.BANDC_AGENT]
    : ["opencode2", "opencode"];
  const command = commands.find(
    (name) => spawnSync(name, ["--version"], { stdio: "ignore" }).status === 0,
  );
  if (!command)
    throw new Error(
      "Install OpenCode or set BANDC_AGENT to its executable path.",
    );
  return command;
}

function main() {
  const sessions = rex(["ls", "--json"]).sessions.filter(
    (session) => session.label === label,
  );
  if (sessions.length) {
    console.log(
      `Open the existing ${label} session in Rex. Restart a stopped server with bun run dev:remote in a new shell tab.`,
    );
    return;
  }
  const command = agentCommand(process.env);
  const agentArgs = process.argv.slice(2);
  const created = rex([
    "new",
    label,
    "-c",
    root,
    "--window",
    "Agent",
    "--shell=none",
    "--json",
    "--",
    command,
    ...(agentArgs.length ? agentArgs : ["--continue"]),
  ]);
  try {
    rex([
      "window",
      "new",
      "-s",
      created.session_id,
      "Server",
      "-c",
      root,
      "--shell=none",
      "--focus=false",
      "--keep-open",
      "--json",
      "--",
      process.execPath,
      "scripts/dev-remote.mjs",
    ]);
  } catch (error) {
    console.error(
      `Agent session created, but the server tab failed. Open ${label} and run bun run dev:remote.`,
    );
    throw error;
  }
  console.log(
    `Open ${label} in Rex. Agent continues your project conversation; Server prints the private HTTPS URL.`,
  );
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

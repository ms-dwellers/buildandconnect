import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { chmod, lstat, readFile, rename, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { parseEnv } from "node:util";

const root = fileURLToPath(new URL("../", import.meta.url));
const environmentFile = new URL("../.env.local", import.meta.url);

export function mergeEnvironment(text, values) {
  const names = new Set(Object.keys(values));
  const kept = text
    .split(/\r?\n/)
    .filter((line) => !names.has(line.split("=", 1)[0].trim()));
  return `${kept.join("\n").trimEnd()}\n${Object.entries(values)
    .map(([name, value]) => `${name}=${value}`)
    .join("\n")}\n`;
}

/** Social sign-in credentials live only on the Convex deployment. */
export const PROVIDER_VARIABLES = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
];

export function providerSummary(names) {
  const configured = [];
  if (names.has("GOOGLE_CLIENT_ID") && names.has("GOOGLE_CLIENT_SECRET"))
    configured.push("Google");
  if (names.has("GITHUB_CLIENT_ID") && names.has("GITHUB_CLIENT_SECRET"))
    configured.push("GitHub");
  return configured.length
    ? `Social sign-in is configured for ${configured.join(" and ")}.`
    : "Social sign-in is not configured; email/password remains available. See docs/backend.md.";
}

export async function configure(siteUrl = process.argv[2]) {
  const info = await lstat(environmentFile);
  if (!info.isFile() || info.isSymbolicLink())
    throw new Error("Use a regular .env.local file in this checkout.");
  const text = await readFile(environmentFile, "utf8");
  const config = parseEnv(text);
  if (
    !config.CONVEX_DEPLOYMENT?.startsWith("dev:") ||
    process.env.CONVEX_DEPLOY_KEY ||
    config.CONVEX_DEPLOY_KEY
  ) {
    throw new Error(
      "Select a cloud development deployment first; this setup never targets production or deploy keys.",
    );
  }
  const site = new URL(siteUrl ?? config.SITE_URL ?? "http://127.0.0.1:5173");
  if (
    !["http:", "https:"].includes(site.protocol) ||
    site.username ||
    site.password
  )
    throw new Error("Provide an HTTP(S) site URL without credentials.");
  function convex(args, input) {
    const result = spawnSync(
      process.execPath,
      ["node_modules/convex/bin/main.js", ...args],
      {
        cwd: root,
        env: { ...process.env, ...config },
        input,
        encoding: "utf8",
      },
    );
    if (result.status !== 0)
      throw new Error(
        `Convex ${args[0]} ${args[1] ?? ""} failed; check your login and selected development deployment.`,
      );
    return result.stdout.trim();
  }
  const names = new Set(
    convex(["env", "list", "--names-only"])
      .split(/\r?\n/)
      .map((line) => line.trim()),
  );
  if (!names.has("BETTER_AUTH_SECRET"))
    convex(
      ["env", "set", "BETTER_AUTH_SECRET"],
      randomBytes(48).toString("base64url"),
    );
  const bridge = names.has("CONVEX_BRIDGE_SECRET")
    ? convex(["env", "get", "CONVEX_BRIDGE_SECRET"])
    : randomBytes(48).toString("base64url");
  if (bridge.length < 32 || /\s/.test(bridge))
    throw new Error(
      "The development bridge secret must be at least 32 characters without whitespace.",
    );
  if (!names.has("CONVEX_BRIDGE_SECRET"))
    convex(["env", "set", "CONVEX_BRIDGE_SECRET"], bridge);
  convex(["env", "set", "SITE_URL"], site.origin);
  // Provider credentials come from the shell environment only, never from
  // .env.local, and are copied to the deployment without being printed.
  for (const name of PROVIDER_VARIABLES) {
    const value = process.env[name]?.trim();
    if (!value) continue;
    convex(["env", "set", name], value);
    names.add(name);
  }
  const temporary = new URL(
    `../.env.local.${randomBytes(8).toString("hex")}.tmp`,
    import.meta.url,
  );
  await writeFile(
    temporary,
    mergeEnvironment(text, {
      CONVEX_BRIDGE_SECRET: bridge,
      SITE_URL: site.origin,
    }),
    { mode: 0o600, flag: "wx" },
  );
  await rename(temporary, environmentFile);
  if (process.platform !== "win32") await chmod(environmentFile, 0o600);
  console.log(
    "Development auth and Worker bridge configured. Existing credentials and local settings were preserved.",
  );
  console.log(providerSummary(names));
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  configure().catch((error) => {
    console.error(
      error.code === "ENOENT"
        ? "Select a Convex deployment first to create .env.local."
        : error.message,
    );
    process.exitCode = 1;
  });
}

import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const bun = process.platform === "win32" ? "bun.exe" : "bun";
if (args.some((arg) => arg !== "--dry-run")) {
  throw new Error(
    "Only --dry-run is supported; production always builds fresh.",
  );
}

for (const name of [
  "CLOUDFLARE_ACCOUNT_ID",
  "VITE_CONVEX_SITE_URL",
  "NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN",
]) {
  if (!process.env[name]?.trim()) {
    throw new Error(`Set ${name} before deploying production.`);
  }
}

if (!/^[a-f0-9]{32}$/.test(process.env.CLOUDFLARE_ACCOUNT_ID)) {
  throw new Error("CLOUDFLARE_ACCOUNT_ID must be a Cloudflare account ID.");
}

const backend = new URL(process.env.VITE_CONVEX_SITE_URL);
if (
  backend.protocol !== "https:" ||
  !backend.hostname.endsWith(".convex.site") ||
  backend.username ||
  backend.password ||
  backend.port ||
  backend.pathname !== "/" ||
  backend.search ||
  backend.hash
) {
  throw new Error("VITE_CONVEX_SITE_URL must be an HTTPS Convex site origin.");
}

if (!process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN.startsWith("pk.")) {
  throw new Error("Use a public Mapbox token, never a secret token.");
}

if (process.env.CI && !process.env.CLOUDFLARE_API_TOKEN) {
  throw new Error("Set the production CLOUDFLARE_API_TOKEN secret for CI.");
}

const zoneResult = spawnSync(
  bun,
  ["run", "cf", "zones", "list", "--name", "buildandconnect.work"],
  { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
);
if (zoneResult.error) throw zoneResult.error;
if (zoneResult.status !== 0) {
  throw new Error("Unable to verify the production Cloudflare account.");
}
const zones = JSON.parse(zoneResult.stdout);
if (
  !zones.some(
    (zone) =>
      zone.name === "buildandconnect.work" &&
      zone.status === "active" &&
      zone.account.id === process.env.CLOUDFLARE_ACCOUNT_ID,
  )
) {
  throw new Error(
    "The selected account does not own the active production zone.",
  );
}

// Never let an inherited local origin leak into production authentication.
process.env.SITE_URL = "https://buildandconnect.work";

const health = await fetch(new URL("/api/health", backend), {
  signal: AbortSignal.timeout(15_000),
});
if (!health.ok || (await health.json()).service !== "buildandconnect") {
  throw new Error(`Convex health check failed (${health.status}).`);
}

const result = spawnSync(
  bun,
  ["run", "cf", "deploy", "--mode", "production", ...args],
  { stdio: "inherit", env: process.env },
);
if (result.error) throw result.error;
process.exit(result.status ?? 1);

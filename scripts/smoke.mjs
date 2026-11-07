import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { setTimeout } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const port = process.env.SMOKE_PORT ?? "4173";
const origin = `http://127.0.0.1:${port}`;
const invocation = process.argv.slice(2);
const [command, ...args] = invocation.length
  ? invocation
  : [
      process.execPath,
      fileURLToPath(
        new URL("../node_modules/vite/bin/vite.js", import.meta.url),
      ),
      "preview",
    ];
const server = spawn(
  command,
  [...args, "--host", "127.0.0.1", "--port", port, "--strictPort"],
  {
    detached: process.platform !== "win32",
    stdio: "inherit",
    env: {
      ...process.env,
      BROWSER: "none",
      WORKERS_AI_REMOTE: "false",
      SITE_URL: origin,
      BETTER_AUTH_SECRET: randomBytes(48).toString("base64"),
    },
  },
);
let spawnError;
const exited = new Promise((resolve) => server.once("close", resolve));
server.on("error", (error) => {
  spawnError = error;
});

try {
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (spawnError) throw spawnError;
    if (server.exitCode !== null)
      throw new Error("Preview exited before readiness");
    try {
      const response = await fetch(`${origin}/api/health`, {
        signal: AbortSignal.timeout(1000),
      });
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {
      // The preview takes a moment to start its Worker runtime.
    }
    await setTimeout(250);
  }
  assert.ok(ready, "Preview did not become ready");

  const home = await fetch(origin);
  assert.equal(home.status, 200);
  const html = await home.text();
  assert.match(html, /Build &amp; Connect/);
  assert.match(html, /Build experience\./);
  assert.match(html, /Make a difference\./);
  assert.match(html, /data-slot="button"/);
  assert.match(html, /data-slot="card"/);
  const stylesheet = html.match(/href="([^\"]+\.css)"/);
  assert.ok(stylesheet, "Home must reference a built stylesheet");
  assert.equal((await fetch(new URL(stylesheet[1], origin))).status, 200);

  const debug = await fetch(`${origin}/debug`);
  assert.equal(debug.status, 200);
  const debugHtml = await debug.text();
  assert.match(debugHtml, /Backend playground/);
  assert.match(debugHtml, /QA walkthrough/);
  assert.match(debugHtml, /data-slot="input"/);
  assert.match(debugHtml, /noindex/);

  const health = await fetch(`${origin}/api/health`);
  assert.equal(health.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await health.json(), {
    status: "ok",
    service: "buildandconnect",
  });
  assert.equal((await fetch(`${origin}/not-a-page`)).status, 404);
  assert.equal(
    (await fetch(`${origin}/api/health`, { method: "POST" })).status,
    405,
  );
  assert.equal((await fetch(`${origin}/.env.local`)).status, 404);
  const protectedRoute = await fetch(`${origin}/api/opportunities`);
  assert.equal(protectedRoute.status, 401);
  assert.equal(protectedRoute.headers.get("Cache-Control"), "no-store");
  console.log(
    "Smoke passed: home, CSS, QA console, health, protected backend, 404, 405, and environment-file denial.",
  );
} finally {
  if (server.pid && server.exitCode === null && server.signalCode === null) {
    try {
      if (process.platform === "win32") {
        const stopped = spawnSync(
          "taskkill.exe",
          ["/PID", String(server.pid), "/T", "/F"],
          {
            stdio: "ignore",
          },
        );
        if (stopped.error) throw stopped.error;
      } else {
        process.kill(-server.pid, "SIGTERM");
      }
    } catch (error) {
      if (error.code !== "ESRCH") throw error;
    }
    await Promise.race([
      exited,
      setTimeout(5000, undefined, { ref: false }).then(() => {
        throw new Error("Preview did not stop after SIGTERM");
      }),
    ]);
  }
}

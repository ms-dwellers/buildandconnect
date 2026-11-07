import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout } from "node:timers/promises";

const port = process.env.SMOKE_PORT ?? "4173";
const origin = `http://127.0.0.1:${port}`;
const invocation = process.argv.slice(2);
const [command, ...args] = invocation.length
  ? invocation
  : ["npm", "run", "start", "--"];
const server = spawn(
  command,
  [...args, "--host", "127.0.0.1", "--port", port, "--strictPort"],
  {
    detached: true,
    stdio: "inherit",
    env: { ...process.env, BROWSER: "none" },
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
  assert.match(html, /Build experience\. Make a difference\./);
  const stylesheet = html.match(/href="([^\"]+\.css)"/);
  assert.ok(stylesheet, "Home must reference a built stylesheet");
  assert.equal((await fetch(new URL(stylesheet[1], origin))).status, 200);

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
  console.log(
    "Smoke passed: home, CSS, health, 404, 405, and environment-file denial.",
  );
} finally {
  if (server.pid) {
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch (error) {
      if (error.code !== "ESRCH") throw error;
    }
    await Promise.race([
      exited,
      setTimeout(5000).then(() => {
        throw new Error("Preview did not stop after SIGTERM");
      }),
    ]);
  }
}

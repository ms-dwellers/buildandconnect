import assert from "node:assert/strict";
import test from "node:test";
import {
  remoteSettings,
  proxyEnvironment,
  supervise,
} from "../scripts/dev-remote.mjs";

test("remote development requires a Tailscale HTTPS origin and a valid assigned port", () => {
  assert.deepEqual(
    remoteSettings({
      PORTLESS_TAILSCALE_URL: "https://example.ts.net:8443",
      PORT: "4500",
    }),
    {
      origin: "https://example.ts.net:8443",
      port: 4500,
    },
  );
  for (const url of [
    "http://example.ts.net",
    "https://example.com",
    "https://user:pass@example.ts.net",
    "https://example.ts.net/path",
  ]) {
    assert.throws(() =>
      remoteSettings({ PORTLESS_TAILSCALE_URL: url, PORT: "4500" }),
    );
  }
  for (const port of ["443", "65536", "bad", "4000.5"]) {
    assert.throws(() =>
      remoteSettings({
        PORTLESS_TAILSCALE_URL: "https://example.ts.net",
        PORT: port,
      }),
    );
  }
});

test("remote startup does not inherit public tunnels or expose its local proxy", () => {
  const env = proxyEnvironment({
    PORTLESS_FUNNEL: "1",
    PORTLESS_LAN: "1",
    PORTLESS_CLOUDFLARE: "1",
    PORTLESS_NGROK: "1",
    UNRELATED: "preserved",
  });
  for (const key of [
    "PORTLESS_FUNNEL",
    "PORTLESS_LAN",
    "PORTLESS_CLOUDFLARE",
    "PORTLESS_NGROK",
    "PORTLESS_SYNC_HOSTS",
  ])
    assert.equal(env[key], "0");
  assert.equal(env.PORTLESS_TAILSCALE, "1");
  assert.equal(env.PORTLESS_PORT, "1355");
  assert.equal(env.UNRELATED, "preserved");
});

test(
  "a failed remote process stops its running sibling and preserves its exit code",
  { timeout: 10000 },
  async () => {
    const code = await supervise([
      ["waiting sibling", "-e", "setInterval(() => {}, 1000)"],
      ["failed service", "-e", "process.exit(7)"],
    ]);
    assert.equal(code, 7);
  },
);

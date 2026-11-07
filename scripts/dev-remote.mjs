import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { configure } from "./configure-convex.mjs";

const root = resolve(fileURLToPath(new URL("../", import.meta.url)));

export function remoteSettings(env) {
  const url = new URL(env.PORTLESS_TAILSCALE_URL);
  if (
    url.protocol !== "https:" ||
    !url.hostname.endsWith(".ts.net") ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error("Portless must provide a private Tailscale HTTPS origin.");
  }
  const port = Number(env.PORT);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error("Portless must assign an unprivileged application port.");
  }
  return { origin: url.origin, port };
}

export function proxyEnvironment(env) {
  return {
    ...env,
    PORTLESS_STATE_DIR: resolve(root, ".portless"),
    PORTLESS_PORT: "1355",
    PORTLESS_HTTPS: "0",
    PORTLESS_TLD: "localhost",
    PORTLESS_SYNC_HOSTS: "0",
    PORTLESS_LAN: "0",
    PORTLESS_TAILSCALE: "1",
    PORTLESS_FUNNEL: "0",
    PORTLESS_NGROK: "0",
    PORTLESS_CLOUDFLARE: "0",
    PORTLESS: "1",
  };
}

export async function supervise(commands, env = process.env) {
  const children = commands.map(([name, ...args]) => ({
    name,
    child: spawn(process.execPath, args, {
      cwd: root,
      env,
      stdio: "inherit",
      detached: process.platform !== "win32",
    }),
  }));
  const exits = children.map(
    ({ name, child }) =>
      new Promise((done) => {
        child.once("error", () => {
          console.error(`${name} could not start.`);
          done(1);
        });
        child.once("exit", (code, signal) => done(code ?? (signal ? 1 : 0)));
      }),
  );
  let stop;
  const interrupted = new Promise((done) => {
    stop = (signal) => done(signal === "SIGINT" ? 130 : 143);
  });
  const onInterrupt = () => stop("SIGINT");
  const onTerminate = () => stop("SIGTERM");
  process.once("SIGINT", onInterrupt);
  process.once("SIGTERM", onTerminate);
  function terminate(signal) {
    for (const { child } of children) {
      if (!child.pid || child.exitCode !== null || child.signalCode !== null)
        continue;
      if (process.platform === "win32") {
        spawnSync("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], {
          stdio: "ignore",
        });
      } else {
        try {
          process.kill(-child.pid, signal);
        } catch (error) {
          if (error.code !== "ESRCH") throw error;
        }
      }
    }
  }
  const code = await Promise.race([...exits, interrupted]);
  terminate("SIGTERM");
  const timeout = setTimeout(() => terminate("SIGKILL"), 5000);
  timeout.unref();
  await Promise.all(exits);
  clearTimeout(timeout);
  process.removeListener("SIGINT", onInterrupt);
  process.removeListener("SIGTERM", onTerminate);
  return code;
}

async function main() {
  if (!process.env.PORTLESS_TAILSCALE_URL) {
    return supervise(
      [
        [
          "Portless",
          "node_modules/portless/dist/cli.js",
          "bandc",
          "--tailscale",
          process.execPath,
          "scripts/dev-remote.mjs",
        ],
      ],
      proxyEnvironment(process.env),
    );
  }
  const { origin, port } = remoteSettings(process.env);
  await configure(origin);
  console.log(
    `Build & Connect: ${origin}\nQA console: ${origin}/debug\nPrivate to your Tailscale network. Ctrl-C stops the app and Convex watcher.`,
  );
  return supervise(
    [
      [
        "Convex",
        "node_modules/convex/bin/main.js",
        "dev",
        "--tail-logs",
        "disable",
      ],
      [
        "Frontend",
        "node_modules/vite/bin/vite.js",
        "dev",
        "--host",
        "127.0.0.1",
        "--port",
        String(port),
        "--strictPort",
      ],
    ],
    {
      ...process.env,
      SITE_URL: origin,
      __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS: new URL(origin).hostname,
    },
  );
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  main()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import test from "node:test";

const launchers = [
  { name: "Bash", command: "bash", prefix: [], script: "dev.sh" },
  {
    name: "PowerShell",
    command: "pwsh",
    prefix: ["-NoProfile", "-File"],
    script: "dev.ps1",
  },
];

for (const launcher of launchers) {
  const available =
    spawnSync(launcher.command, ["--version"], { stdio: "ignore" }).status ===
    0;
  test(
    `${launcher.name} launcher forwards tasks, paths, arguments, and failures`,
    {
      skip:
        !available ||
        (launcher.name === "Bash" && process.platform === "win32"),
    },
    () => {
      const temporary = realpathSync(
        mkdtempSync(join(tmpdir(), "buildandconnect-launcher-")),
      );
      const root = join(temporary, "project with spaces");
      const binaries = join(temporary, "binaries");
      mkdirSync(join(root, "scripts"), { recursive: true });
      mkdirSync(join(root, "node_modules"));
      mkdirSync(binaries);
      cpSync(
        new URL("../package.json", import.meta.url),
        join(root, "package.json"),
      );
      for (const script of [launcher.script, "check-development.mjs"]) {
        cpSync(
          new URL(`../scripts/${script}`, import.meta.url),
          join(root, "scripts", script),
        );
      }
      const mockBun = join(
        binaries,
        process.platform === "win32" ? "bun.cmd" : "bun",
      );
      const mockSource = join(binaries, "bun-shim.cjs");
      writeFileSync(
        mockSource,
        `
if (process.argv[2] === "--version") {
  console.log("1.4.2");
} else {
  console.log(JSON.stringify({ arguments: process.argv.slice(2), cwd: process.cwd() }));
  process.exit(Number(process.env.TEST_BUN_EXIT_CODE ?? 0));
}
`,
      );
      if (process.platform === "win32") {
        writeFileSync(
          mockBun,
          `@echo off\r\n"${process.execPath}" "%~dp0bun-shim.cjs" %*\r\nexit /b %errorlevel%\r\n`,
        );
      } else {
        writeFileSync(
          mockBun,
          `#!${process.execPath}\nrequire(${JSON.stringify(mockSource)});\n`,
        );
      }
      chmodSync(mockBun, 0o755);

      function run(args: string[], exitCode = 0) {
        const environment: NodeJS.ProcessEnv = {
          ...process.env,
          TEST_BUN_EXIT_CODE: String(exitCode),
        };
        const pathKey =
          Object.keys(environment).find(
            (key) => key.toLowerCase() === "path",
          ) ?? "PATH";
        environment[pathKey] = `${binaries}${delimiter}${process.env[pathKey]}`;
        return spawnSync(
          launcher.command,
          [...launcher.prefix, join(root, "scripts", launcher.script), ...args],
          {
            cwd: temporary,
            encoding: "utf8",
            env: environment,
          },
        );
      }

      try {
        const help = run(["--help"]);
        assert.equal(help.status, 0, help.stderr);
        assert.match(help.stdout, /Usage:/);

        const missing = run(["dev"]);
        assert.equal(missing.status, 1);
        assert.match(missing.stderr, /Dependencies are missing/);

        const setup = run(["setup", "--ignore-scripts"]);
        assert.equal(setup.status, 0, setup.stderr);
        assert.deepEqual(JSON.parse(setup.stdout), {
          arguments: ["install", "--frozen-lockfile", "--ignore-scripts"],
          cwd: root,
        });

        mkdirSync(join(root, "node_modules", "vite"));
        writeFileSync(join(root, "node_modules", "vite", "package.json"), "{}");
        const defaults = run([]);
        assert.equal(defaults.status, 0, defaults.stderr);
        assert.deepEqual(JSON.parse(defaults.stdout), {
          arguments: ["run", "dev"],
          cwd: root,
        });

        const argumentsToForward = [
          "--label",
          "a value with spaces",
          "--tag",
          "semi;colon",
        ];
        const forwarded = run(["test", ...argumentsToForward]);
        assert.equal(forwarded.status, 0, forwarded.stderr);
        assert.deepEqual(JSON.parse(forwarded.stdout), {
          arguments: ["run", "test", ...argumentsToForward],
          cwd: root,
        });
        assert.equal(run(["check"], 7).status, 7);
        assert.equal(run(["deploy"]).status, 1);
      } finally {
        rmSync(temporary, { recursive: true, force: true });
      }
    },
  );
}

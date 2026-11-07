# Team development setup

## Laptop support

| Laptop                     | Runtime                                      | Entry point                                                   |
| -------------------------- | -------------------------------------------- | ------------------------------------------------------------- |
| NixOS x86-64               | Pinned Nix shell                             | `nix run .#dev` or `bash scripts/dev.sh dev` inside the shell |
| macOS ARM64 (both laptops) | Native ARM64 Node.js 26                      | `bash scripts/dev.sh dev`                                     |
| Fedora x86-64              | Native x64 Node.js 26                        | `bash scripts/dev.sh dev`                                     |
| Windows ARM64              | Windows 11, Node.js 26; x64 Node recommended | `.\scripts\dev.ps1 dev`                                       |

Use Node.js **26.13.0 or newer within 26.x**, including npm. The scripts check
the required version against `package.json` before installing or running tasks.
Install Node from [nodejs.org](https://nodejs.org/en/download) or your existing
version manager, selecting version 26 instead of assuming the current LTS is
compatible. No global Vinext, Vite, or Cloudflare CLI is needed.

Only Linux x86-64 execution is tested in this repository setup. PowerShell scripts
are also parsed, formatted, and exercised with PowerShell on Linux. macOS and
Windows hardware still need a teammate's first-run verification.

## macOS ARM64 and Fedora x86-64

On the Macs, use the ARM64 Node installer and a native terminal rather than a
Rosetta terminal. On Fedora, use the x64 build. macOS's bundled Bash is sufficient
for the launcher; installing Nix or upgrading Bash is optional.

From a checkout:

```sh
node --version
npm --version
bash scripts/dev.sh setup
bash scripts/dev.sh dev --host 127.0.0.1
```

The Node version must satisfy the range above. If using Nix on either platform,
`direnv allow` or `nix develop` supplies Node and the shell formatters instead.

## Windows ARM64

Use Windows 11. The pinned `workerd` package has no native Windows ARM64 binary;
it maps Windows ARM64 to its x64 executable. Windows 11's x64 emulation is needed.
Installing **x64 Node.js 26** is the simpler option: npm installs x64 native
dependencies consistently. Native ARM64 Node can use workerd's installer fallback,
but that route has not been tested here and requires its postinstall script to run.

Use PowerShell 7 (recommended) or Windows PowerShell 5.1 for the launcher:

```powershell
node --version
node -p "process.arch"
npm.cmd --version
.\scripts\dev.ps1 setup
.\scripts\dev.ps1 dev --host 127.0.0.1
```

With the recommended Node install, `process.arch` prints `x64` even on ARM
hardware. The script uses `npm.cmd`, avoiding execution-policy errors from
`npm.ps1`. It does not change your execution policy. If local scripts are blocked,
review them and use your organization's approved policy; for a downloaded file,
`Unblock-File .\scripts\dev.ps1` may be sufficient when your policy permits local
scripts. Do not disable machine-wide protections for this project.

Alternatively, use an ARM64 Linux distribution under WSL2 with Linux ARM64 Node
and the Bash launcher. Keep that checkout in the Linux filesystem, not shared
with a native Windows dependency installation.

References: [workerd platform mapping](https://github.com/cloudflare/workerd/tree/main/npm)
and [Microsoft's Windows ARM emulation guide](https://learn.microsoft.com/en-us/windows/arm/apps-on-arm-x86-emulation).

## Daily tasks

The scripts resolve the repository from their own location. They can be invoked
with an absolute path from another folder, including paths containing spaces.
Arguments after the task go directly to the corresponding npm command.

| Task                                      | Purpose                                             |
| ----------------------------------------- | --------------------------------------------------- |
| `setup`                                   | Install the lockfile with `npm ci`                  |
| `dev`                                     | Start the development server; also the default task |
| `build`                                   | Build the Worker                                    |
| `start`                                   | Preview the existing build locally                  |
| `test`                                    | Run tests                                           |
| `typecheck`                               | Check TypeScript                                    |
| `fmt` / `fmt:check`                       | Format / check web source and documentation         |
| `check`                                   | Check web formatting, types, and tests              |
| `smoke`                                   | Verify the built app over HTTP and stop the preview |
| `fmt:powershell` / `fmt:powershell:check` | Format / check PowerShell after formatter setup     |
| `--help`                                  | List supported tasks                                |

```sh
bash scripts/dev.sh check
bash scripts/dev.sh build
bash scripts/dev.sh smoke
```

```powershell
.\scripts\dev.ps1 check
.\scripts\dev.ps1 build
.\scripts\dev.ps1 smoke
```

The smoke test stops its process tree on both Unix and Windows. Set `SMOKE_PORT`
if port 4173 is occupied. No task provisions a service or deploys the app.

## Formatters

Prettier is installed by `setup`. Nix users also get nixfmt and shfmt; run
`nix run .#fmt` and `nix run .#fmt-check` for Nix and Bash files. Without Nix,
contributors editing Bash can use shfmt and run `shfmt -w scripts/*.sh`.

PowerShell formatting uses **PSScriptAnalyzer 1.25.0**. Install its pinned module
into ignored `.tools/powershell/` with PowerShell 7 (also available on macOS and
Linux), then format or check all PowerShell scripts:

```powershell
pwsh -NoProfile -File scripts/format-powershell.ps1 -Install
pwsh -NoProfile -File scripts/format-powershell.ps1 -Check
```

After installation, `npm run fmt:powershell` and `npm run fmt:powershell:check`
are equivalent entrypoints. Formatting also checks analyzer errors. Installation
is explicit; normal setup/check tasks do not download PowerShell modules.

## Dependencies and secrets

- Each laptop runs its own `setup`. Never copy `node_modules` across CPUs, operating
  systems, or Windows/WSL. After switching Node architecture, run `setup` again.
- Keep native optional dependencies enabled: workerd, Tailwind, and TypeScript
  need platform-specific packages. Do not use `--omit=optional`.
- The scaffold needs no credentials. Later configuration belongs in ignored
  `.env.local` / `.dev.vars` or provider secret stores. Scripts do not write, print,
  or export secrets, and they never source arbitrary `.env` files into a shell.
- All tracked text uses LF line endings to keep shell scripts usable across
  checkouts. PowerShell accepts LF as well.

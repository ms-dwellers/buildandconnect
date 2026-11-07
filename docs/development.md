# Team development setup

## Toolchain

Use **Bun 1.4.2 or newer within 1.4.x** for package management and **Node.js
26.13.0 or newer within 26.x** for the existing Worker toolchain and test runner.
The launchers check both versions. `bun.lock` is the only dependency lockfile.

Install Bun from [its official installation guide](https://bun.sh/docs/installation)
and Node from [nodejs.org](https://nodejs.org/en/download), or use your existing
version managers. No global Vite, Vinext, or Cloudflare CLI is needed.

| Laptop        | Toolchain                                | Entry point                                  |
| ------------- | ---------------------------------------- | -------------------------------------------- |
| NixOS x86-64  | Pinned Nix Bun and Node                  | `nix run .#dev` or `bash scripts/dev.sh dev` |
| macOS ARM64   | Native ARM64 Bun and Node                | `bash scripts/dev.sh dev`                    |
| Fedora x86-64 | Native x64 Bun and Node                  | `bash scripts/dev.sh dev`                    |
| Windows ARM64 | Windows 11; x64 Bun and Node recommended | `.\scripts\dev.ps1 dev`                      |

Only Linux x86-64 is execution-tested here. PowerShell launchers are also tested
on Linux when PowerShell is available. macOS and Windows hardware still need a
teammate's first-run verification.

## macOS ARM64 and Fedora x86-64

On the Macs, use ARM64 installers and a native terminal, not Rosetta. On Fedora,
use x64 builds. The bundled macOS Bash is sufficient; Nix is optional.

```sh
node --version
bun --version
bash scripts/dev.sh setup
bash scripts/dev.sh dev --host 127.0.0.1
```

For Nix, `direnv allow` or `nix develop` supplies both tools and shell formatters.
Entering the shell does not install dependencies or launch any process.

## Windows ARM64

Use Windows 11 with **x64 Node.js and x64 Bun** under x64 emulation. The pinned
workerd does not ship a Windows ARM64 executable. Keeping both tools x64 selects
the x64 native dependencies without requiring a fallback download. Bun offers
a native ARM64 version, but that combination is not the tested project path.

Use PowerShell 7 (recommended) or Windows PowerShell 5.1:

```powershell
node --version
node -p "process.arch"
bun --version
.\scripts\dev.ps1 setup
.\scripts\dev.ps1 dev --host 127.0.0.1
```

`process.arch` should print `x64` for this setup. The launcher uses the Bun
executable directly, without npm's PowerShell shim. It does not change execution
policy. If local scripts are blocked, review them and follow your organization's
policy; `Unblock-File .\scripts\dev.ps1` may be sufficient for downloaded files.
Do not disable machine-wide protections.

Alternatively, use ARM64 Linux under WSL2 with Linux ARM64 tools. Keep its checkout
in the Linux filesystem and never share `node_modules` with native Windows.

References: [workerd platform mapping](https://github.com/cloudflare/workerd/tree/main/npm)
and [Windows ARM emulation](https://learn.microsoft.com/en-us/windows/arm/apps-on-arm-x86-emulation).

## Daily tasks

Both launchers work from any directory, including paths with spaces. Arguments
after the task go directly to the corresponding package script via `bun run`.

| Task                                      | Purpose                                             |
| ----------------------------------------- | --------------------------------------------------- |
| `setup`                                   | `bun install --frozen-lockfile`                     |
| `dev`                                     | Start the development server; the default task      |
| `build`                                   | Build the Worker                                    |
| `start`                                   | Preview an existing build locally                   |
| `test`                                    | Run the existing Node test suite                    |
| `typecheck`                               | Check TypeScript                                    |
| `fmt` / `fmt:check`                       | Format / check web source and documentation         |
| `check`                                   | Check web formatting, types, and tests              |
| `smoke`                                   | Verify the built app over HTTP and stop the preview |
| `fmt:powershell` / `fmt:powershell:check` | Format / check PowerShell after setup below         |
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

Or run `bun run check`, `bun run build`, and `bun run smoke` from the repository
root. Use **`bun run test`**, not the separate `bun test` runner. Do not pass
`--bun`: Vite, Cloudflare tooling, and tests intentionally use Node.

The smoke test stops its process tree on Unix and Windows. Set `SMOKE_PORT` if
4173 is occupied. No setup/check task provisions services or deploys the app.

## Formatters

Prettier is installed by `setup`. Nix also supplies nixfmt and shfmt; use
`nix run .#fmt` and `nix run .#fmt-check` for Nix and Bash. Without Nix, contributors
editing Bash can use shfmt and run `shfmt -w scripts/*.sh`.

PowerShell formatting uses **PSScriptAnalyzer 1.25.0**, installed into ignored
`.tools/powershell/`. With PowerShell 7:

```powershell
pwsh -NoProfile -File scripts/format-powershell.ps1 -Install
pwsh -NoProfile -File scripts/format-powershell.ps1 -Check
```

After installation, `bun run fmt:powershell` and `bun run fmt:powershell:check`
are equivalent. Normal setup/check tasks do not download PowerShell modules.

## Dependencies and secrets

- Run `setup` on each laptop. Never copy native `node_modules` across operating
  systems, CPUs, or Windows/WSL. Reinstall after changing toolchain architecture.
- Add or update dependencies with Bun, then commit `package.json` and `bun.lock`.
  Do not regenerate an npm lockfile. Frozen installs must succeed without changing
  the lockfile. Nix's fixed-output Bun cache hash also needs updating in `flake.nix`.
- Keep optional dependencies enabled; workerd, Tailwind, and TypeScript need
  platform-specific packages. `esbuild` and `workerd` are explicitly trusted for
  their install scripts; do not blanket-trust dependencies.
- Keep local configuration in ignored `.env.local` / `.dev.vars` or provider
  secret stores. Never put credentials in source or Nix expressions. Bun loads
  environment files automatically; avoid printing environment variables.
- All tracked text uses LF endings. PowerShell accepts LF too.

# Build & Connect

A hackathon app connecting early-career developers with non-technical people and
companies through shared interests and social-impact projects.

**Current state:** landing page, Mapbox nearby-request UI, `/api/health`, and a
Hono backend with Better Auth, Convex persistence, Workers AI analysis, growth-oriented
matching, recruiter discovery, opportunity-specific mutual interest, and exclusive
local-request claims. See [the backend guide](docs/backend.md) for setup and API
examples. For browser-based backend QA, run the frontend and open `/debug`.
Signed-in users land on a role dashboard at `/dashboard` (developer, requester,
company, or recruiter). The public Calgary `/map` shows live requests and
opportunities with role-specific actions. See [the map guide](docs/calgary-map.md).
The future native Swift iOS app is deliberately not scaffolded or built on Linux.

## Develop

Nix is optional. See [the team setup guide](docs/development.md) for macOS ARM,
Fedora x86-64, and Windows ARM setup.

With Bun 1.4.2 or newer within 1.4.x and Node.js 26.13 or newer within 26.x:

```sh
bash scripts/dev.sh setup
bash scripts/dev.sh dev --host 127.0.0.1
```

In PowerShell:

```powershell
.\scripts\dev.ps1 setup
.\scripts\dev.ps1 dev --host 127.0.0.1
```

Both entrypoints support the same tasks, forward arguments, and work regardless
of your current directory. Use `--help` to list tasks. `setup` runs `bun install --frozen-lockfile`;
it never installs system tools, creates secrets, or deploys anything.

### NixOS / optional Nix setup

Install Nix with flakes enabled, direnv with nix-direnv, and your shell's direnv
hook. The flake pins Bun and Node.js 26 (the Cloudflare CLI needs a newer runtime than
Node.js 24.21). Linux x86-64, Linux ARM64, and Apple Silicon development shells
are declared; only Linux x86-64 is verified here.

```sh
direnv allow
bun install --frozen-lockfile
bun run dev --host 127.0.0.1
```

Without direnv, use `nix develop` before those Bun commands. No dependency install,
server, deployment, or migration runs automatically on shell entry.

The dev server prints its local URL. Optional local configuration belongs in
ignored `.env.local` or `.dev.vars` files, never in source. `.env.example` lists
integration settings with no values. The landing page needs no credentials;
the backend requires a Convex development deployment and settings from the backend guide.

### Connect the backend

```sh
bunx convex login
bunx convex deployment select TEAM:PROJECT:dev
bun run setup:backend
bun run dev:backend
```

Keep `dev:backend` running in another terminal alongside the frontend. It syncs
Convex functions to your cloud development deployment; it does not deploy the
frontend or touch production. Keep the generated `convex/_generated/` files in
source control. The existing `/api` routes remain the frontend contract.

### Remote development with Rex

With Rex, OpenCode, and Tailscale installed on the development host:

```sh
bun run dev:rex
```

Open **build-and-connect** in Rex on your phone. **Agent** continues the latest
project conversation; **Server** starts the frontend and Convex watcher and prints
the private Tailscale HTTPS link. Pass `--session SESSION_ID` to resume a specific
OpenCode conversation. The launcher reuses an existing project session.

To run only the server stack in an existing terminal, use `bun run dev:remote`.
Your phone must be connected to the same tailnet. See
[remote development](docs/development.md#remote-development) for requirements.

## Commands

Run source commands from the repository root after `bun install --frozen-lockfile`. Without Nix, use
`bash scripts/dev.sh TASK` or `.\scripts\dev.ps1 TASK`; these call the package scripts
below. The formatting checks cover JS/TS, CSS, JSON, and Markdown. Nix also
checks Nix and Bash formatting. PowerShell has a separate pinned formatter,
documented in the [team setup guide](docs/development.md#formatters).

| Nix command                         | Bun equivalent                                   | Purpose                                   |
| ----------------------------------- | ------------------------------------------------ | ----------------------------------------- |
| `nix run .#dev -- --host 127.0.0.1` | `bun run dev --host 127.0.0.1`                   | Development server                        |
| `nix run .#build`                   | `bun run build`                                  | Worker production build                   |
| `nix run .#test`                    | `bun run test`                                   | API, matching, and scaffold tests         |
| `nix run .#typecheck`               | `bun run typecheck`                              | TypeScript checks                         |
| `nix run .#fmt`                     | `bun run fmt` plus nixfmt and shfmt              | Format source                             |
| `nix run .#fmt-check`               | `bun run fmt:check` plus nixfmt and shfmt checks | Check formatting                          |
| `nix run .#check`                   | `bun run check` plus nixfmt and shfmt checks     | Formatting, types, tests                  |
| `nix run .#smoke`                   | `bun run smoke`                                  | Start built preview, verify HTTP, stop it |

For example, run `build` followed by `smoke` using either script. The `start`
task previews an existing build. Deployment is intentionally not exposed by
these development entrypoints.

`bun run start --host 127.0.0.1` previews the built Worker locally. Build first.
The smoke test checks the home page, built CSS, health response, unknown route,
unsupported health method, and refusal to serve `.env.local`. It uses port 4173
by default; set `SMOKE_PORT` if needed.

### Nix package

```sh
nix flake show
nix flake check
nix build
nix run . -- --host 127.0.0.1 --port 3000
```

The default package contains the built Worker, assets, and its local preview
runtime. The default app serves that built artifact, not the source dev server.
This preview is for local testing; deploy the Worker for hosting. Dependencies
are fetched from `bun.lock` into a fixed-output Bun cache, not during the sandboxed
application build. Nix uses an explicit source allowlist and excludes local
environment files. Never pass private build-time values into Nix. When changing
dependencies, run `bun install` and update the Bun cache hash in `flake.nix`.

Bun manages dependencies and runs package scripts; Vite and Cloudflare tooling
still run on Node. Tests use Node and Vitest/convex-test. Use `bun run test`, not Bun's
separate built-in `bun test` runner.

## Architecture and service setup

The component foundation is [coss ui](https://coss.com/ui/docs), with the supplied
emerald, cream, wheat, apricot, and coral palette. See
[docs/design-system.md](docs/design-system.md) before adding UI components.

See [docs/architecture.md](docs/architecture.md) for ownership and integration
steps. React/Vinext App Router, Tailwind, and Hono run in one Cloudflare Worker.
Convex owns application data and Better Auth's official Convex component. Workers AI supplies Llama analysis and
BGE Small embeddings; TypeScript owns deterministic matching. Mapbox powers
location search and nearby maps. Convex is the only application database; the
Worker remains the browser-facing API.

Dependency setup does not create remote services. Connecting the backend requires
selecting a Convex development deployment. Deploy production only when requested. After
reviewing configuration and authenticating with Cloudflare, `bun run deploy`
builds and publishes the Worker; it is not part of local verification.

No license has been selected for this repository.

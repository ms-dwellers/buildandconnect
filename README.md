# Build & Connect

A hackathon app connecting early-career developers with non-technical people and
companies through shared interests and social-impact projects.

**Current state:** landing page, `/api/health`, and a Hono backend with Better Auth,
D1 persistence, Workers AI analysis, growth-oriented matching, recruiter discovery,
and opportunity-specific mutual interest. Matching/account UI and maps are not
implemented. See [the backend guide](docs/backend.md) for setup and API examples.
For browser-based backend QA, run the frontend and open `/debug`.
The future native Swift iOS app is deliberately not scaffolded or built on Linux.

## Develop

Nix is optional. See [the team setup guide](docs/development.md) for macOS ARM,
Fedora x86-64, and Windows ARM setup.

With Node.js 26.13 or newer within version 26 and npm installed:

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
of your current directory. Use `--help` to list tasks. `setup` only runs `npm ci`;
it never installs system tools, creates secrets, or deploys anything.

### NixOS / optional Nix setup

Install Nix with flakes enabled, direnv with nix-direnv, and your shell's direnv
hook. The flake pins Node.js 26 (the Cloudflare CLI needs a newer runtime than
Node.js 24.21). Linux x86-64, Linux ARM64, and Apple Silicon development shells
are declared; only Linux x86-64 is verified here.

```sh
direnv allow
npm ci
npm run dev -- --host 127.0.0.1
```

Without direnv, use `nix develop` before those npm commands. No dependency install,
server, deployment, or migration runs automatically on shell entry.

The dev server prints its local URL. Optional local configuration belongs in
ignored `.env.local` or `.dev.vars` files, never in source. `.env.example` lists
integration settings with no values. The landing page needs no credentials;
the backend requires local migrations and auth settings from the backend guide.

## Commands

Run source commands from the repository root after `npm ci`. Without Nix, use
`bash scripts/dev.sh TASK` or `.\scripts\dev.ps1 TASK`; these call the npm scripts
below. The npm formatting checks cover JS/TS, CSS, JSON, and Markdown. Nix also
checks Nix and Bash formatting. PowerShell has a separate pinned formatter,
documented in the [team setup guide](docs/development.md#formatters).

| Nix command                         | npm equivalent                                   | Purpose                                   |
| ----------------------------------- | ------------------------------------------------ | ----------------------------------------- |
| `nix run .#dev -- --host 127.0.0.1` | `npm run dev -- --host 127.0.0.1`                | Development server                        |
| `nix run .#build`                   | `npm run build`                                  | Worker production build                   |
| `nix run .#test`                    | `npm test`                                       | API, matching, and scaffold tests         |
| `nix run .#typecheck`               | `npm run typecheck`                              | TypeScript checks                         |
| `nix run .#fmt`                     | `npm run fmt` plus nixfmt and shfmt              | Format source                             |
| `nix run .#fmt-check`               | `npm run fmt:check` plus nixfmt and shfmt checks | Check formatting                          |
| `nix run .#check`                   | `npm run check` plus nixfmt and shfmt checks     | Formatting, types, tests                  |
| `nix run .#smoke`                   | `npm run smoke`                                  | Start built preview, verify HTTP, stop it |

For example, run `build` followed by `smoke` using either script. The `start`
task previews an existing build. Deployment is intentionally not exposed by
these development entrypoints.

`npm run start -- --host 127.0.0.1` previews the built Worker locally. Build first.
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
are fetched through the pinned npm cache derivation, not during the sandboxed
application build. Nix uses an explicit source allowlist and excludes local
environment files. Never pass private build-time values into Nix.

## Architecture and service setup

The component foundation is [coss ui](https://coss.com/ui/docs), with the supplied
emerald, cream, wheat, apricot, and coral palette. See
[docs/design-system.md](docs/design-system.md) before adding UI components.

See [docs/architecture.md](docs/architecture.md) for ownership and integration
steps. React/Vinext App Router, Tailwind, and Hono run in one Cloudflare Worker.
D1 owns application and Better Auth data. Workers AI supplies Llama analysis and
BGE Small embeddings; TypeScript owns deterministic matching. Mapbox remains
planned for maps. No separate API server or Convex database is required.

No remote service is created during setup. Deploy only when requested. After
reviewing configuration and authenticating with Cloudflare, `npm run deploy`
builds and publishes the Worker; it is not part of local verification.

No license has been selected for this repository.

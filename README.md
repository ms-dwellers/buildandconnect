# Build & Connect

A hackathon app connecting early-career developers with non-technical people and
companies through shared interests and social-impact projects.

**Current state:** runnable web scaffold with a landing page and `/api/health`.
Accounts, maps, persistence, matching, and marketplace flows are not implemented.
The future native Swift iOS app is deliberately not scaffolded or built on Linux.

## Develop

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
future integration settings with no values. The scaffold needs no credentials.

## Commands

Run source commands from the repository root after `npm ci`.

| Nix command                         | npm equivalent                                   | Purpose                                   |
| ----------------------------------- | ------------------------------------------------ | ----------------------------------------- |
| `nix run .#dev -- --host 127.0.0.1` | `npm run dev -- --host 127.0.0.1`                | Development server                        |
| `nix run .#build`                   | `npm run build`                                  | Worker production build                   |
| `nix run .#test`                    | `npm test`                                       | Health route tests                        |
| `nix run .#typecheck`               | `npm run typecheck`                              | TypeScript checks                         |
| `nix run .#fmt`                     | `npm run fmt` plus nixfmt and shfmt              | Format source                             |
| `nix run .#fmt-check`               | `npm run fmt:check` plus nixfmt and shfmt checks | Check formatting                          |
| `nix run .#check`                   | `npm run check` plus nixfmt and shfmt checks     | Formatting, types, tests                  |
| `nix run .#smoke`                   | `npm run smoke`                                  | Start built preview, verify HTTP, stop it |

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

See [docs/architecture.md](docs/architecture.md) for ownership and integration
steps. React/Vinext App Router and Tailwind run on Cloudflare Workers. Convex owns
application data and backend functions; Better Auth will use its official Convex
integration. Mapbox provides maps. Prefer Cloudflare for remaining infrastructure.
Hono is unnecessary unless an actual API requirement cannot fit those services.

No remote service is created during setup. Deploy only when requested. After
reviewing configuration and authenticating with Cloudflare, `npm run deploy`
builds and publishes the Worker; it is not part of local verification.

No license has been selected for this repository.

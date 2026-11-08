# Build & Connect

A hackathon app connecting early-career developers with non-technical requesters
through shared interests and social-impact projects. Developer and Requester are
the only account roles; do not reintroduce Company or Recruiter account types.

## Scope and stack

- Web: React, Vinext App Router, TypeScript, and Tailwind CSS.
- UI: use coss-ui components from `components/ui/`, backed by Base UI. Add missing
  primitives from the `@coss` registry in `components.json`, not shadcn's default
  registry or a parallel custom component set. Native HTML remains appropriate
  for headings, landmarks, and ordinary content.
- Theme: use the semantic tokens in `app/globals.css`. The page canvas and cards
  are white. Pine `#174C43` is the primary; soft mint `#CCE0D9` and muted teal
  `#8FB3AC` are supporting surfaces and landscape/water scenery, used as accents
  on white rather than as a tint over the whole site. Preserve the original
  emerald `#1E6348`, cream `#F8F7DE` (text on pine, mist, map roads), wheat
  `#F6DFB3`, apricot `#F0A345`, and coral `#EB5757` as supporting and warm accent
  colors. Keep raw palette values out of components; WebGL scenes read tokens at
  runtime with `getComputedStyle`. Use contrast-safe text pairings and keep the
  interface light unless dark mode is explicitly requested.
- Avoid decorative pills. Use plain text for ordinary labels; reserve
  softly rectangular, comfortably padded badges for actual status or metadata.
- Do not add heading prefixes, decorative section numbers, or eyebrow labels
  before headings. Start with the heading itself, including in the design system.
- Prefer restrained tactile styling: raised solid buttons with a visible lower
  edge and real press travel, subtle card shadows, no heavy gloss. Keep navigation
  links flat and preserve keyboard, disabled, and reduced-motion behavior.
- Backend and data: Convex owns HTTP actions, authentication, AI execution,
  schema, persistence, and atomic transitions. `backend/` contains shared pure
  validation and matching helpers, not a separately hosted API. D1 has been replaced; `migrations/` is
  legacy reference only. Do not reintroduce a second application database.
- Authentication: Better Auth's official Convex component. Keep browser requests
  same-origin through a thin `/api` forwarding route. Native clients call the
  Convex HTTP site directly. Persistence functions are internal and revalidate
  live sessions, ownership, and roles; clients never submit trusted AI output.
- Maps: Mapbox.
- AI: Fireworks for structured analysis and Qwen3 embeddings; ElevenLabs for voice.
  Provider calls and credentials belong in Convex, not in the frontend Worker.
  Do not reintroduce OpenRouter or Cloudflare Workers AI.
- Other infrastructure: prefer Cloudflare products (Workers, R2, Queues,
  Durable Objects, etc.), except the explicitly selected Convex backend.
- iPhone: native SwiftUI in `ios/`; build, test, and formatting commands are in
  `ios/README.md` and `package.json`. Xcode is required only for iOS tasks, never web
  development. Edit `ios/project.yml`, not generated Xcode projects or Info.plist.
- Native UI follows the web design system in `app/globals.css` and `components/ui/`.
  `ios/Sources/Core/Design.swift` and `Controls.swift` own its SwiftUI equivalents.
  Use opaque surfaces and tactile controls, not Liquid Glass.
- Current scope includes growth-oriented matching and opportunity-specific mutual
  interest. Do not invent payment or messaging flows without product direction.

## Secrets in chat

The user may provide secrets directly in chat for this hackathon. Accept them
without requiring another delivery channel, and use them only for the requested
configuration. This permission does not make the chat itself a secret vault.

- Never copy secret values into tracked files, source code, tests, fixtures,
  documentation, commit messages, issues, PRs, public logs, or client bundles.
- Do not repeat secret values in replies, command output, URLs, or diagnostics.
- If persistence is requested, use ignored local environment files with private
  permissions or the relevant provider's secret store. Verify ignore rules
  before writing a local secret. Prefer stdin over command-line arguments.
- Keep `.env.example` value-free. Never put secrets in Nix expressions, derivation
  arguments, or store paths; the Nix store is not private storage.
- `BETTER_AUTH_SECRET`, Fireworks, and ElevenLabs credentials belong only in Convex's
  environment. No application bridge secret is needed. Keep Convex CLI account/deploy keys
  outside tracked source; never publish production changes during local setup.
- `NEXT_PUBLIC_*` and `VITE_*` values are public. Never place a private key or
  Better Auth secret there. A restricted Mapbox public token is intentionally
  browser-visible, but its value still does not belong in tracked source.
- Do not commit chat transcripts or credential-bearing screenshots. If a secret
  is exposed, stop propagation and tell the user to rotate it without repeating it.

## Development

- Use jj in this Git-backed repository and preserve existing worktree changes. Commit locally;
  publish or deploy only when requested. Never add AI co-author attribution.
- Do not run tests unless the user explicitly requests testing. Building,
  formatting, installing, and capturing app previews remain allowed.
- Use Bun for package installation and scripts; `bun.lock` is the only dependency
  lockfile. Keep Node.js 26 for the existing toolchain and `node --test` runner.
- Run `bun run check`, `bun run build`, and `bun run smoke` for scaffold changes.
  Nix and direnv commands are documented in `README.md`.
- Formatter approval: use project-pinned Prettier for TypeScript, CSS, JSON, and
  Markdown, nixfmt for Nix, and Nix-pinned shfmt for shell scripts. These are
  approved for this repository. PSScriptAnalyzer 1.25.0 is approved for PowerShell;
  install it locally with `scripts/format-powershell.ps1 -Install`, then run its
  `-Check` mode for PowerShell changes. Do not install modules globally.
- Support NixOS x86-64, macOS ARM64, Fedora x86-64, and Windows ARM64 (using the
  pinned workerd's x64 compatibility path). Keep Bash and PowerShell entrypoints
  aligned and keep `package.json` scripts as the task owner. Never require Nix on teammates'
  machines or share native `node_modules` between operating systems.
- Keep server secrets out of client components and public health responses.
- Keep generated outputs, local credentials, and installed dependencies ignored.

## Skill sources

Canonical repository: https://github.com/ms-dwellers/buildandconnect

For this organization-owned project, try the private skill catalog for co.codes
repository `hackr/agents-ms-dwellers`, ref `main`, path `index.json`, using
authenticated access. Load relevant skills alongside the shared catalog when
available. Initial discovery had no live read grant; no private instructions
were loaded. Do not assume the private library exists or is available.

Loading and routing contract:
https://co.codes/t:a/hackr/agents/docs/private-libraries.md?ref=main
Keep credentials out of this file.

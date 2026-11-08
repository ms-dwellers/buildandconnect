# Build & Connect · Figma kit

This folder is the drafting source for the Figma design system. The live gallery is `/design-system`.

## Live Figma file

[Build & Connect Design System](https://www.figma.com/design/PoIrnxJWB91aRbjeetj9v0)

File key: `PoIrnxJWB91aRbjeetj9v0` (also stored as `FIGMA_FILE_KEY` in ignored `.env.local`).

Pages:

1. **Cover** — brand mark, Community / Developer chips
2. **Foundations / Colors** — core palette + semantic swatches in both modes
3. **Typography** — League Spartan + DM Mono text styles
4. **Components** — Button, Badge, Card, Input, Tabs with dual-theme instances
5. **Patterns** — empty draft frames for shell, request form, map chrome

Color collection modes: **Community** (light pine/mint on cream) and **Developer** (dark-fire burnt ember canvas with apricot primary). Shared highlight is coral. Wheat/cream stay core palette accents only; Developer page chrome no longer uses them as canvas.

## What is here

| File                 | Purpose                                                               |
| -------------------- | --------------------------------------------------------------------- |
| `tokens.json`        | Tokens Studio export with **Community** and **Developer** themes      |
| `typography.md`      | League Spartan + DM Mono text styles                                  |
| `inventory.md`       | Page map and coss component checklist                                 |
| `sync-variables.mjs` | Optional push to Figma Variables API when Enterprise + file key exist |

## Tokens Studio fallback

If you need to re-import tokens manually:

1. Install the **Tokens Studio** plugin in the Figma file above
2. Import `tokens.json`, enable the Community theme, then switch to Developer
3. Keep text styles aligned with `typography.md`

## Optional Variables API sync

```sh
node design/figma/sync-variables.mjs
```

Requires `FIGMA_ACCESS_TOKEN` and `FIGMA_FILE_KEY` in `.env.local`, plus an Enterprise seat with `file_variables:write`. The MCP Plugin API path above is the supported default for this hackathon.

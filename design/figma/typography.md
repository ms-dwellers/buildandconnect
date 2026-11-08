# Typography

Self-hosted in `public/fonts/` with SIL Open Font Licenses. No Google Fonts request at runtime.

## Families

| Role                                        | Family         | CSS token                       | Weights in repo    |
| ------------------------------------------- | -------------- | ------------------------------- | ------------------ |
| Body, nav, buttons, compact headings        | League Spartan | `--app-font-sans` / `font-sans` | 400, 500, 600, 700 |
| Large headings (`h1`, `h2`, `font-display`) | League Spartan | `--app-font-display`            | 700                |
| Form labels, legends, metadata              | DM Mono        | `--app-font-mono` / `font-mono` | 400, 500           |

Space Mono files remain in `public/fonts/` for license completeness; the live theme uses League Spartan and DM Mono.

## Figma text styles to create

1. **Display / H1** — League Spartan Bold, ~48–72px, tight tracking
2. **Display / H2** — League Spartan Bold, ~32–40px
3. **Body / Default** — League Spartan Regular, 16px, relaxed leading
4. **Body / Muted** — League Spartan Regular, 14–16px, muted foreground
5. **Label / Mono** — DM Mono Regular or Medium, 12–14px
6. **Button** — League Spartan Medium/Semibold, 14px

Install the same `.ttf` files from `public/fonts/` into Figma (or match from your system) before linking text styles.

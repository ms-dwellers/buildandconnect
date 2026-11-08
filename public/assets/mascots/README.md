# Supplied mascot

The eight original GIFs were imported unchanged from the project's `origin/main`
at `1a039d2e`. The filenames use export labels: `_1000` files are actually
160×160px; `_300` files are 48×48px. No third-party artwork was copied from Kinopio.

`still/` contains the first frame of each 160px GIF, preserving its palette and
transparency. Regenerate with `bun run assets:mascot`. The shared `Mascot`
component uses these static assets by default and for reduced motion. The account
entry's optional animated greeting stops after four seconds.

These images are decorative: they never replace labels, error text, progress,
consent, or other necessary information. Keep pixel rendering crisp and avoid
stretching them to a different aspect ratio.

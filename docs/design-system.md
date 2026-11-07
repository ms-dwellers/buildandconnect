# Design system

Open `/design-system` for the live component gallery. It covers foundations,
actions, forms, choices, feedback, overlays, navigation, and content with more
than 30 coss-ui component families. Examples use local state only and do not call
the application backend. Reloading resets the examples.

Use [coss ui](https://coss.com/ui/docs), built on Base UI, for controls and reusable
UI primitives. Source is owned locally in `components/ui/`; the upstream MIT
notice is retained there. `components.json` points `@coss` at the official registry.

```sh
bunx shadcn@latest add @coss/input
```

Add only what a feature needs. Do not install similarly named shadcn/Radix
primitives or create a second button, card, form, or dialog implementation.
Semantic HTML is still the right choice for page structure and content.

## Palette

| Reference color | Value     | Role                                       |
| --------------- | --------- | ------------------------------------------ |
| Soft mint       | `#CCE0D9` | Framed hero and supporting surfaces        |
| Muted teal      | `#8FB3AC` | Water and scenery                          |
| Pine            | `#174C43` | Primary actions, illustration, focus rings |
| Emerald depths  | `#1E6348` | Original supporting green                  |
| Cream           | `#F8F7DE` | Page, cards, clouds, text on pine          |
| Wheat           | `#F6DFB3` | Warm supporting accent                     |
| Golden apricot  | `#F0A345` | Illustration accent, warning tint          |
| Coral           | `#EB5757` | Landing-page calls to action, illustration |

`app/globals.css` maps these to the complete coss semantic token contract. Use
`bg-primary`, `text-foreground`, `text-muted-foreground`, etc. in components, not
raw hex codes. The illustration has its own semantic accents so decorative color
does not silently become a status or action color.

The original coral is not a white-text button color. Destructive actions use a
darker derived red; error copy uses a darker foreground. Pale surfaces use dark
text, coral highlight buttons pair the original coral with deep green text, and
primary buttons pair pine with cream. The current theme is
intentionally light-only; OS dark-mode preference does not change its colors.

Use the 60/30/10 rule as a visual balance: beige is the main page canvas,
mint and teal form the framed landscape and supporting surfaces, and warm accents
remain sparse. The reference informs the composition rather than a full-page
color swap: a mint hero, cream clouds, layered trees, and a teal waterfront sit
inside the beige page. Keep the original cream, wheat, apricot, and coral values.
Reserve coral for
selected calls to action and small illustration details, and apricot for the sun,
warm roof accents, and warning tints. These are composition guidelines, not fixed
percentages enforced on every component or the map.

## Components and typography

- Start directly with headings. No decorative section numbers, eyebrow labels,
  or other heading prefixes. This applies to both the app and this gallery.
- The landing page uses open spacing, bold League Spartan headings, light paper
  texture, and a softly framed mint hero with an original code-native neighborhood
  garden, layered trees, clouds, and a teal waterfront. Keep
  decorative artwork out of the accessibility tree; do not treat it as map data.

- No decorative pills. Ordinary labels are plain text. Badges are
  softly rectangular with a small radius, explicit line height, and enough padding
  for their text. They do not shrink to squashed capsules on desktop.
- Filled and outlined buttons have a solid lower edge and depress by 2–4px while
  held. Their shadow collapses by the same amount without moving surrounding
  layout. Ghost and link variants stay flat. Disabled and loading buttons do not
  press; reduced motion makes the feedback immediate rather than animated.
- Toggles use the same raised edge. Selected toggles stay depressed and emerald;
  unselected toggles rise back up. Group items move independently, including when
  selected by keyboard. Their ARIA pressed state remains the source of truth.
- Keep skeuomorphism minimal: tactile controls, a slight paper-like lift on cards,
  and calm mint/teal surfaces with warm accents. Avoid large glows, glossy
  gradients, or textures.

- Buttons, cards, badges, separators, and loading indicators come from coss.
- Use `render` for element composition, not Radix's `asChild`.
- Prefer coss variants and sizes. Use local classes for layout, not a replacement
  set of component styles.
- Body text, navigation, buttons, and compact component headings use League Spartan.
  Large headings (`h1`, `h2`, and `font-display`) use bold League Spartan. Form labels and
  legends use DM Mono, also available through `font-mono` for metadata and code.
  Fonts are self-hosted in `public/fonts/` with their SIL Open Font Licenses and
  use `font-display: swap`; no Google request is made when visiting the app.
- The isolated application root and relatively positioned body preserve Base UI
  portal layering and Safari backdrop behavior.
- Keep focus visible, icons decorative unless they convey unique information,
  and motion optional. The global reduced-motion and forced-colors rules apply
  to the entire component layer.
- Inputs, tab labels, and menu shortcuts use full-opacity muted text to retain
  contrast on the warm backgrounds. Preserve these adaptations when updating
  upstream coss components.

The home page introduces the product; its links navigate to real page content.
It does not simulate accounts, matching results, or completed project activity.

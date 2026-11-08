# Design system

The signed-in [mascot fieldbook](mascot-fieldbook.md) uses the supplied pixel
mascot, dotted mint boards, pine rules, and flat navigation on the white canvas.
Mascot feedback has a global pause control and a static reduced-motion fallback;
success and error reactions are brief. Sign-in and onboarding share this artwork.

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

| Reference color | Value     | Role                                         |
| --------------- | --------- | -------------------------------------------- |
| Soft mint       | `#CCE0D9` | Supporting surfaces and scenery              |
| Muted teal      | `#8FB3AC` | Water and scenery                            |
| Pine            | `#174C43` | Primary actions, illustration, focus rings   |
| Emerald depths  | `#1E6348` | Original supporting green                    |
| Cream           | `#F8F7DE` | Text on pine; developer canvas and map roads |
| Wheat           | `#F6DFB3` | Warm supporting accent; developer secondary  |
| Golden apricot  | `#F0A345` | Developer primary; illustration and warning  |
| Coral           | `#EB5757` | Highlight CTA; landing and developer accent  |

The page canvas and cards are white (`--palette-white`); the reference colours
sit on it as structure, scenery, and accents rather than as a page tint. Status
colours are distinct from the primary: success is emerald, info a deep teal,
warning apricot; muted text is a lighter grey-green than body text.

`app/globals.css` maps these to the complete coss semantic token contract. Use
`bg-primary`, `text-foreground`, `text-muted-foreground`, etc. in components, not
raw hex codes. The illustration has its own semantic accents so decorative color
does not silently become a status or action color.

### Dual theme

- **Community (default `:root`):** green foundation. Guests, requesters, and the
  public landing stay on pine, mint, and teal with cream canvas.
- **Developer (`data-theme="developer"`):** dark-fire foundation. Applied for the
  whole session while `session.role === "developer"`. Canvas is burnt ember
  (`#4A2816`), primary is apricot with flame glow, outline/input chrome uses
  flame orange, highlight CTAs stay coral, and text is warm peach on ember.

Preview either mode on `/design-system`. Importable Tokens Studio files and the
Figma page map live in `design/figma/`.

The original coral is not a white-text button color. Destructive actions use a
darker derived red; error copy uses a darker foreground. Pale community surfaces
use dark text, coral highlight buttons pair the original coral with deep text, and
community primary buttons pair pine with cream. Developer primary pairs apricot
with near-black ember text. Community stays light-only; Developer is an intentional
dark role theme. OS dark-mode preference does not change either kit.

Use the 60/30/10 rule as a visual balance: white is the community page canvas,
pine/mint/teal form structure and scenery, and warm accents stay sparse there.
On the developer side, ember surfaces lead and apricot/flame/coral take over
primary actions and chrome. Keep the original cream, wheat, apricot, and coral
palette values. Reserve coral for selected calls to action and small illustration
details, and apricot for fire primary, glow, and developer chrome. These are
composition guidelines, not fixed percentages enforced on every component or the
map.

## Components and typography

- The shared `components/brand-logo.tsx` renders the supplied campfire and clasped
  hands logo from `public/brand/campfire-clasped-hands.svg`. The SVG is copied
  unchanged from the original artwork and is also the site icon. Keep the visible
  wordmark or an accessible home-link name alongside the decorative image.

- Start directly with headings. No decorative section numbers, eyebrow labels,
  or other heading prefixes. This applies to both the app and this gallery.
- The landing page uses open spacing, bold League Spartan headings, and a white
  hero whose heading, lead, and actions are server-rendered and available
  immediately. The focal point sits between the heading and the two calls to
  action: a lazily loaded Three.js scene (`components/landing/home-scene.tsx`)
  with two procedural chairs, a task chair for the developer and a wooden chair
  for the person who needs one, angled toward a monitor that plays a
  canvas-drawn campfire. The canvas covers the whole hero rather than a box: a
  camera view offset frames the furniture into the band beneath the copy at full
  size while the heading floats in the same space. Every colour comes from `--palette-*`
  and `--scene-*` tokens read at runtime. Behind the developer chair, low-poly tech marks (brackets, braces, a chip, a
  terminal, a gear, a diamond, a dot grid) float, turn, and run off the left
  edge; behind the partner chair, a stand of low-poly pines and bushes runs off
  the right edge. Both are procedural meshes that sprout from the ground on
  load, so no asset files are loaded. The header and hero fill at least the first viewport; the remaining
  sections scroll below. Typography adapts to viewport width and height.
- The chairs are the calls to action. Each carries a real button above it
  ("I'm a developer: Find a project" on the task chair, "I need a developer:
  Post a request" on the wooden chair), positioned from the scene's projected
  anchors on screens 40rem and wider and shown as a plain row under the scene
  otherwise, before WebGL is ready, and without WebGL at all. Hovering or
  focusing a chair or its button lifts the chair and intensifies that side's
  backdrop: the pines deepen from mint and teal to pine and emerald and sway
  harder, the marks brighten to pine and apricot, grow, and turn faster. Clicking the developer chair or the
  monitor starts the map journey; clicking the partner chair opens the request
  form. The canvas itself is `aria-hidden`. Reduced motion renders one static
  frame, and the render loop pauses while the tab is hidden or the hero is
  off-screen.
- When the map journey begins with the hero visible, the scene registers an
  approach beat: the canvas breaks out of its box to cover the whole viewport
  (a camera view offset keeps the furniture where it was while the frame grows),
  the camera dollies into the monitor while its screen crossfades to the city
  name, and then the mist takes over.

- No decorative pills. Ordinary labels are plain text. Badges are
  softly rectangular with a small radius, explicit line height, and enough padding
  for their text. They do not shrink to squashed capsules on desktop.
- Filled and outlined buttons use a raised lower edge and depress while held.
  Ghost and link variants stay flat. Disabled and loading buttons do not press;
  reduced motion makes the feedback immediate rather than animated.
- Community raised chrome is soft: rounded corners (`--button-radius`), a solid
  outer edge shadow, and a light top inset highlight. Travel depth is 2–4px by
  size. The shadow collapses by the same amount on press without shifting
  surrounding layout.
- Developer raised chrome is pixel-slab only: `--button-radius: 0`, a real
  `--button-pixel` hard outline border (skirt clipped to padding-box so it
  cannot halo outside the edge), a 1px top bevel via inset `box-shadow`, and a
  darker internal skirt whose height is `--button-depth` (4px / 6px / 8px by
  size). On press the face translates by that depth and the skirt collapses
  flush; the outline stays. Apricot/coral fire bloom is a single soft
  drop-shadow on hover/focus only. Toggles inherit the same `.button-raised`
  chrome.
- Developer surfaces site-wide (cards, inputs, dialogs, menus, toasts, map
  panels, badges) remapped via theme tokens: all `--radius*` and
  `--badge-radius` are `0`, `--border` is the hard pixel outline, and
  `--shadow-card` / `--fieldbook-shadow` are hard offset drops with no blur.
  Soft coss inset sheens on `.bg-card` / `.bg-popover` are disabled. Switches,
  radios, checkboxes, and badges go square with hard pixel outlines (and a
  short hard drop on badges). Avatars stay round as stepped voxel circles
  (`clip-path` + a few hard drop-shadows for outline). Alerts, progress/meter
  tracks, skeletons, and sliders use square slabs / chunky bars; slider thumbs
  are square with a hard outline. Lucide icons in buttons and alerts use square
  caps / miter joins. The Spinner swaps to an 8-cell pixel ring (stepped
  opacity comet) under Developer. No mass clip-path or filter stacks on
  panels.
  Fonts stay League Spartan / DM Mono.
- Toggles use the same raised edge as buttons in the active theme. Selected
  toggles stay depressed; unselected toggles rise back up. Group items move
  independently, including when selected by keyboard. Their ARIA pressed state
  remains the source of truth.
- Keep skeuomorphism minimal: tactile controls, a slight paper-like lift on
  Community cards, and calm mint/teal surfaces with warm accents there. Developer
  prefers hard pixel edges over soft glows on resting surfaces.

- Buttons, cards, badges, separators, and loading indicators come from coss.
- Use `render` for element composition, not Radix's `asChild`.
- Prefer coss variants and sizes. Use local classes for layout, not a replacement
  set of component styles.
- Body text, navigation, buttons, and compact component headings use League Spartan.
  Large headings (`h1`, `h2`, and `font-display`) use bold League Spartan. Form labels use
  DM Mono, also available through `font-mono` for metadata and code; legends and
  section headings stay in League Spartan.
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

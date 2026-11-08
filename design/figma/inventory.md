# Figma page map and component inventory

## Pages (live file)

File: https://www.figma.com/design/PoIrnxJWB91aRbjeetj9v0

1. **Cover** — product name, Community vs Developer theme chips, link to `/design-system`
2. **Foundations / Colors** — core palette swatches + semantic tokens for both modes
3. **Typography** — text styles listed in `typography.md`
4. **Components** — Button, Badge, Card, Input, Tabs with dual-theme instances
5. **Patterns** — shell header, request form, nearby map chrome, developer dashboard drafts

## Brand

- Logo: `public/brand/campfire-clasped-hands.svg` (`components/brand-logo.tsx`)
- Keep a wordmark or accessible home-link name beside the mark

## coss-ui primitives (`components/ui/`)

| Component               | Notes                                    |
| ----------------------- | ---------------------------------------- |
| accordion               |                                          |
| alert                   |                                          |
| avatar                  |                                          |
| badge                   | Softly rectangular; not a pill           |
| button                  | Raised depth 2–4px; ghost/link stay flat |
| card                    | Light paper lift                         |
| checkbox                |                                          |
| dialog                  |                                          |
| empty                   |                                          |
| field / fieldset / form |                                          |
| input / textarea        |                                          |
| kbd                     |                                          |
| label                   | DM Mono                                  |
| menu                    |                                          |
| meter / progress        |                                          |
| popover                 |                                          |
| radio-group             |                                          |
| scroll-area             |                                          |
| segmented-control       |                                          |
| select                  |                                          |
| separator               |                                          |
| skeleton                |                                          |
| slider                  |                                          |
| spinner                 |                                          |
| switch                  |                                          |
| table                   |                                          |
| tabs                    |                                          |
| toast                   |                                          |
| toggle / toggle-group   | Selected stays depressed                 |
| tooltip                 |                                          |

## Behaviors to preserve in Figma notes

- No decorative pills for ordinary labels
- No heading eyebrows or section number prefixes
- Focus rings use `--ring`
- Reduced-motion: press feedback is immediate, not animated
- Community composition: cream canvas, mint/teal scenery, sparse warm accents
- Developer composition: burnt ember canvas (#4A2816), apricot primary, flame ring (#EE962F), coral highlight, warm peach text

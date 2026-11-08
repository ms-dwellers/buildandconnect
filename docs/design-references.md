# UI review and design references

The core direction below has since been implemented in the
[mascot fieldbook](mascot-fieldbook.md). The original observations remain here
as the design rationale; remaining recommendations are follow-up ideas.

## Recommended direction

**Verdict:** keep the current direction. The review found one small control
alignment defect, corrected below; the larger layout ideas are recommendations,
not reasons to discard the account-first flow.

Keep the cream canvas, mint account-entry frame, pine actions, and garden
illustration. Give the working screens the feel of a **community project
fieldbook**: quiet navigation, readable briefs, practical metadata, and an
obvious next action. Do not replace direct sign-in with another marketing page.

The best combination is **Luma's decision hierarchy + Are.na's restraint + a
small amount of Kinopio's handmade character**. Use Cosmos only as a reference
for the illustrated welcome area, not for the task screens.

These are references for principles, not assets to copy. Screenshots are local
review evidence; artwork, fonts, logos, and proprietary UI code have not been
imported into the app. Any implementation should use the existing coss-ui
components and semantic theme tokens.

## References inspected

The following public pages were opened in Chromium at 1440px during this review.
Their content may change; observations refer to the captured versions.

| Reference                                    | Useful pattern                                                                                | Apply here                                                                                            | Do not copy                                                                                     |
| -------------------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| [Luma event page](https://luma.com/jlnifjub) | A clear title, grouped time/place facts, host identity, and a prominent action panel          | Project detail: scope, weekly commitment, location, compensation, requester, then explicit interest   | Ticketing, payment flows, decorative tags, or low-contrast muted text                           |
| [Are.na](https://www.are.na/about)           | Content-first layout, restrained dividers, flat navigation, collection relationships          | Dashboard: compact project rows and clear sections; career view: requirement-to-project relationships | An all-white brand reset or copying its community/network model                                 |
| [Kinopio](https://kinopio.club/)             | Small tactile cards, visible connections, and playful illustrations around a usable workspace | Account-entry illustration and an occasional requirement-to-practice connector                        | A freeform canvas for mandatory onboarding or controls hidden inside artwork                    |
| [Cosmos](https://www.cosmos.so/)             | Cream background, object-like imagery, strong central focus                                   | The welcome illustration can suggest the kinds of community projects available                        | Floating motion around form inputs, a second landing page, or pill-shaped decoration everywhere |

Luma's captured example is a past event: use its information hierarchy, not its
expired-event state, as the project reference. The captured Cosmos homepage
featured lamp discovery; do not assume its current campaign is a project app.

## Keep from the recent changes

- Direct account entry and a clear return path to public project discovery.
- Separate role selection and confirmation; role choice is consequential.
- Four setup steps with Back/Continue, editable shortcuts, and consent off by
  default. Never turn the illustrations into required interaction.
- The real Calgary map, labeled pins, map/list coordination, and a 2D/3D choice.
- Role-specific dashboard actions instead of equally weighted panels everywhere.

## Next design pass

1. Make the career requirement-to-practice connection the central visual story.
   A selected requirement should lead directly to concrete project activity,
   followed by a link to the complete brief. Keep honest limits around
   self-reported skills and practice versus qualifications.
2. Use a consistent project summary across map, career, and dashboard views:
   title, purpose, time commitment, paid/volunteer status, and one action.
   Preserve the full brief on the detail page.
3. Keep action areas compact on mobile. Scrolling through a whole description
   should not be necessary to understand the commitment; avoid a sticky panel
   until it has been checked against keyboard focus and narrow viewports.
4. Retain the garden's character at entry, then reduce decoration during work.
   Prefer clear section spacing and restrained borders over nested cards.

These were the initial recommendations, not additional product features.
Delivery, messaging, payments, and hiring decisions remain outside the current
product scope.

## Review coverage

Scope: the recent account-first entrance, role confirmation, and developer setup
on the React/Vinext app, plus the populated demo screens checked separately.
The governing conventions are `AGENTS.md`, `docs/design-system.md`, coss-ui,
and the semantic tokens in `app/globals.css`.

| Domain        | Evidence                                                                                | Result                                                                                                   |
| ------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Accessibility | Account-entry browser journey, label and state checks, axe WCAG A/AA scan               | No automated violations on the exercised account/setup states; not a screen-reader certification         |
| Layout        | Account/setup renders at 320, 390, 720, and 1440px; screenshot inspection               | No horizontal overflow; narrow-screen header and setup remain usable but take substantial vertical space |
| Writing       | Account shell, skill choices, consent instructions, retry states                        | Consent and retry guidance add necessary meaning; preserve them when simplifying                         |
| Typography    | Desktop entry/skills and narrow entry/preferences screenshots                           | No visible clipping in the inspected states; no proposal to replace the existing type system             |
| Color         | Rendered light theme and automated contrast checks                                      | No contrast violations reported by axe for those states; no invented contrast ratios                     |
| UI polish     | Selected skill states, progress, switches, Back/Continue and reduced-motion browser run | State feedback is clear; keep decorative character away from required controls                           |

The account browser journey used mocked API/model boundaries to exercise failure
and retry states. Populated demo browsing uses real sign-in and persisted data.
The populated dashboards, career view, map, and project details passed 24 axe
scans across 320, 390, and 1440px, with no horizontal overflow. Career filtering,
requirement-linked activities, private drafts, and interest states were checked.

### Corrected during review

| Severity | Domain    | Location                                                    | Before                                                        | After                                                            | Why                                                                                                   |
| -------- | --------- | ----------------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| LOW      | UI polish | `components/app/auth-form.tsx`, password visibility control | A 36px control protruded below the 34px input by 3px at 320px | Use the existing 28px coss-ui icon size and center it vertically | Keeps the hover/focus surface aligned with its field; measured contained at 320, 390, 720, and 1440px |

The control retains its accessible name, pressed state, keyboard behavior, and
the shared button's coarse-pointer hit-area expansion. This is a small alignment
fix, not a change to authentication or a new component set.

### Observations from populated screens

- The food-bank project has a useful, specific title, but the page starts with
  the generic “Opportunity” heading. In the next layout pass, make the project
  title the primary page heading and use “project” consistently in the UI.
- At a 1440×1100 viewport, the food-bank project's interest action sits below
  the first screen. A Luma-style summary/action panel could put time, volunteer
  status, requester, and explicit interest together without hiding scope or
  suggesting an automatic connection.
- The developer dashboard presents career navigation in the hero, section
  action, and sidebar. Keep one prominent invitation and make the other routes
  quieter rather than creating competing large actions.
- Demo disclosures intentionally remain visible. On narrow project summaries,
  their repeated introduction uses space that would normally describe the work;
  do not mistake fixture wording for a production content strategy.

These are next-pass recommendations rather than new functional blockers or
claims that a different visual style is inherently more accessible.

# Calgary map frontend

Open `/`, select **Find a project**, or visit `/map` directly. The landing-page
link draws in softly lit mist over 650 ms, navigates underneath it, then waits
for Mapbox's first loaded render before the cloud banks drift apart over 1000 ms.
Three translucent layers move at different speeds, with rounded puffs and wisps
trailing the opening. App-header map links use the same transition. Direct map visits
show a static loading surface without starting the shader. Reduced-motion
preferences skip it; **Skip animation** or Escape also finishes it immediately.

The transition uses one WebGL canvas, one triangle, and one 128 × 128 procedural
density-and-lighting texture (64 KiB, generated once per transition). Overlapping
round lobes and surface-normal lighting make soft cloud clumps rather than
stretched, marbled noise. There are no sprite
elements, per-frame React updates, or third-party rendering library. Its drawing
buffer stays within 768 × 512, independent of device pixel ratio. Rendering stops
when the cover is complete and while the tab is hidden. GPU resources are released
on exit. WebGL initialization failures or context loss fall back to a CSS fade;
independent deadlines keep navigation working if animation callbacks are lost.
The landing-page pixel-art scene is unchanged.

The map shows live Convex records through the public `GET /api/map` feed: open
company opportunities that have a map pin, and open community requests. No demo
data remains. Select a pin or list entry to open its details; search by skill,
title, organisation or neighbourhood, and filter Paid, Volunteer or Community.

## Who sees what

Browsing is public. `backend/listings.ts` decides what each viewer receives:

| Viewer                                      | Opportunities              | Community requests                                                      |
| ------------------------------------------- | -------------------------- | ----------------------------------------------------------------------- |
| Guest, company, recruiter, other requesters | Exact pin and company name | Location rounded to about 1 km, no requester name or place text         |
| Developer                                   | Exact pin                  | Exact pin, place and requester name (as the request API already allows) |
| Request owner or claimant                   | Exact pin                  | Exact, and still visible after it is accepted                           |

Claimed requests leave the public map; closed requests and closed opportunities
never appear. Postings outside Calgary's bounds are not listed.

## Role actions

Popups show actions for the signed-in role. Convex enforces every rule again:

- Guests: **Sign in to respond**, returning to the same listing.
- Developers: **Accept request** or **Release request**, and **See your fit** for
  opportunities. The feed refreshes after each change.
- Requesters and companies: **Post a request** / **Post an opportunity** in the
  sidebar enters placement mode. Click the map or use **Use downtown Calgary**
  (keyboard alternative) to open the form with that pin prefilled. Owners get
  **Edit**, **Manage requests** or **View candidates**.

Dashboards link to `/map?focus=<id>` to select a listing on arrival.

## Mapbox and the credential-free preview

Set a restricted `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` in an ignored `.env.local` and
restart Vite to use Mapbox Standard. It is intentionally browser-visible; never
use a private Mapbox token. The initial overhead view fits Calgary citywide;
nearby postings cluster into numbered circles. Select a cluster to expand it,
or a P (paid), V (volunteer) or R (community request) point to fly into that job's neighbourhood. Selection
uses zoom 16.6, a 60-degree pitch and Standard's real 3D building data. Building
detail depends on Mapbox coverage; this is not a street-level photograph.

**All Calgary** returns to the overhead city overview. Navigation controls support
manual zoom, rotation and pitch. Flights respect reduced motion. Popups open when
the camera settles so their anchors do not race the animation. Mobile list
selection brings the map into view. Navigation bounds allow local context around
Calgary so the full city fits on narrow screens, but do not permit world travel.
There is no geolocation request.

`lib/calgary-map.ts` contains pure GeoJSON, layer and camera definitions.
`use-calgary-map.ts` owns SDK setup, source updates, camera commands, retries and
cleanup. GPU-backed clustered layers render postings; one native Mapbox marker
anchors the selected coss popover without per-frame React updates. Fatal token
or WebGL failures fall back to the illustration; isolated tile errors retain the
live map and offer a retry.

Without a token, or if Mapbox/WebGL fails, the page shows an explicitly labelled
illustrated Calgary preview. The illustration is not a navigational street map.
It is only a fallback, never the loading screen. A failed load releases the
clouds and offers a retry; retrying returns to clouds until Mapbox is ready.
It preserves its aspect ratio on narrow screens, uses the same job coordinates,
and supports popups, role actions and pin placement. It does not simulate 3D buildings.
Without a token, it makes no map-provider requests.

## Verification

Run `bun run check`, `bun run build`, and `bun run smoke`. The Calgary unit tests
cover bounds, projection, responsive framing and filters; `tests/listings.test.ts`
and `tests/convex/roles.test.ts` cover feed privacy and visibility; smoke checks
the public map, its feed, and the role pages. Browser QA should additionally cover:

- Landing link, cloud cover, city reveal, Escape/skip, browser Back and re-entry.
- Direct `/map` visit and reduced-motion navigation, neither with a cloud replay.
- Delayed Mapbox loading: only clouds, no illustrated map or preview pins. The
  landing transition must stay covered past five seconds until loading resolves.
- Failed Mapbox loading releases the fallback; retry shows clouds again. Loading
  clouds remain static with reduced motion enabled.
- Pin/list selection, popup close/focus, search, type filters and empty results.
- Pointer placement and downtown keyboard placement opening the prefilled form.
- Mobile widths and desktop list scrolling, with no page-width overflow.
- Map feed privacy for guests, developers, owners and claimants; role actions.
- Real Mapbox tiles, citywide framing, cluster expansion, pin/list 3D selection,
  camera interruption, overview reset, reduced motion, and failure/retry fallback.
  Use an authorized public token. Do not retain credential-bearing network logs.

# Calgary map frontend

Open `/`, select **Find a project**, or visit `/map` directly. The landing-page
link gathers clouds, navigates beneath them, then waits for Mapbox's first loaded
render before parting the clouds. Direct map visits show clouds over the map
while it loads, without replaying the journey. Reduced-motion
preferences skip it; **Skip animation** or Escape also finishes it immediately.

The map is a public frontend prototype, separate from the existing authenticated
request API. It never creates profiles, saves locations, claims work, or invokes
Workers AI. Existing backend routes and request-posting pages remain available
but are not wired into this prototype.

## Jobs and placement

`lib/calgary.ts` owns the Calgary bounds, central demo jobs, and preview projection.
`lib/calgary-neighbourhoods.ts` adds fictional postings across all four quadrants,
from Evanston and Tuscany to Seton and Somerset. Jobs have real geographic
coordinates, not real vacancies. Select a map pin or a project in the list to
open its details. Search by
skill, title, organisation or neighbourhood, and filter paid/volunteer work.

**Add demo job** enables placement by clicking the map. **Use downtown Calgary**
provides a keyboard-accessible placement alternative. Complete the dialog to add
a job at that position. Additions live only in component state and disappear on
reload or when the page is unmounted. Nothing is posted to the backend, and the
popups do not pretend that applications or payments work.

## Mapbox and the credential-free preview

Set a restricted `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` in an ignored `.env.local` and
restart Vite to use Mapbox Standard. It is intentionally browser-visible; never
use a private Mapbox token. The initial overhead view fits Calgary citywide;
nearby postings cluster into numbered circles. Select a cluster to expand it,
or a P (paid) / V (volunteer) point to fly into that job's neighbourhood. Selection
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
and supports popups and local pin placement. It does not simulate 3D buildings.
Without a token, it makes no map-provider requests.

## Verification

Run `bun run check`, `bun run build`, and `bun run smoke`. The Calgary unit tests
cover bounds, projection, responsive framing and job filters; smoke checks the
public map and landing-page entry point. Browser QA should additionally cover:

- Landing link, cloud cover, city reveal, Escape/skip, browser Back and re-entry.
- Direct `/map` visit and reduced-motion navigation, neither with a cloud replay.
- Delayed Mapbox loading: only clouds, no illustrated map or preview pins. The
  landing transition must stay covered past five seconds until loading resolves.
- Failed Mapbox loading releases the fallback; retry shows clouds again. Loading
  clouds remain static with reduced motion enabled.
- Pin/list selection, popup close/focus, search, type filters and empty results.
- Pointer placement, downtown keyboard placement, dialog cancellation and reload.
- Mobile widths and desktop list scrolling, with no page-width overflow.
- No `/api/*` calls from the map or landing page.
- Real Mapbox tiles, citywide framing, cluster expansion, pin/list 3D selection,
  camera interruption, overview reset, reduced motion, and failure/retry fallback.
  Use an authorized public token. Do not retain credential-bearing network logs.

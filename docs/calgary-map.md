# Calgary map frontend

Open `/`, select **Find a project**, or visit `/map` directly. The landing-page
link gathers clouds, navigates beneath them, then parts the clouds as the city
zooms into view. Direct map visits do not replay the journey. Reduced-motion
preferences skip it; **Skip animation** or Escape also finishes it immediately.

The map is a public frontend prototype, separate from the existing authenticated
request API. It never creates profiles, saves locations, claims work, or invokes
Workers AI. Existing backend routes and request-posting pages remain available
but are not wired into this prototype.

## Jobs and placement

`lib/calgary.ts` owns the fictional jobs, Calgary camera bounds, and illustrated
preview projection. Paid and volunteer jobs have real geographic coordinates in
Calgary. Select a map pin or a project in the list to open its details. Search by
skill, title, organisation or neighbourhood, and filter paid/volunteer work.

**Add demo job** enables placement by clicking the map. **Use downtown Calgary**
provides a keyboard-accessible placement alternative. Complete the dialog to add
a job at that position. Additions live only in component state and disappear on
reload or when the page is unmounted. Nothing is posted to the backend, and the
popups do not pretend that applications or payments work.

## Mapbox and the credential-free preview

Set a restricted `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` in an ignored `.env.local` and
restart Vite to use Mapbox streets. It is intentionally browser-visible; never
use a private Mapbox token. The camera is restricted to Calgary's bounding area,
with bounded zoom and no repeated worlds. There is no geolocation request.

Without a token, or if Mapbox/WebGL fails, the page shows an explicitly labelled
illustrated Calgary preview. The illustration is not a navigational street map.
It preserves its aspect ratio on narrow screens, uses the same job coordinates,
and supports popups and local pin placement. It makes no map-provider requests.

## Verification

Run `bun run check`, `bun run build`, and `bun run smoke`. The Calgary unit tests
cover bounds, projection, responsive framing and job filters; smoke checks the
public map and landing-page entry point. Browser QA should additionally cover:

- Landing link, cloud cover, city reveal, Escape/skip, browser Back and re-entry.
- Direct `/map` visit and reduced-motion navigation, neither with a cloud replay.
- Pin/list selection, popup close/focus, search, type filters and empty results.
- Pointer placement, downtown keyboard placement, dialog cancellation and reload.
- Mobile widths and desktop list scrolling, with no page-width overflow.
- No `/api/*` calls from the map or landing page.
- Real Mapbox loading and bounds with an authorized public token, plus failure
  fallback. Credential-free browser tests do not establish live tile integration.

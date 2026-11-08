# Backend API

## Local setup

Use Bun and Node.js 26, then install with `bun install --frozen-lockfile`.
The frontend runs locally; auth and data live in a Convex cloud **development** deployment.

```sh
bunx convex login
bunx convex deployment select TEAM:PROJECT:dev
bun run setup:backend
bun run dev:backend
```

Select the existing team/project instead of creating a duplicate. Convex writes
`CONVEX_DEPLOYMENT`, `VITE_CONVEX_URL`, and `VITE_CONVEX_SITE_URL` into ignored
`.env.local`. Setup adds `SITE_URL` and the server-only `CONVEX_BRIDGE_SECRET`,
preserving Mapbox and other settings. It reuses existing development secrets rather
than rotating them. The script refuses production selections and deploy keys.
An optional argument changes the local origin: `bun run setup:backend http://localhost:5173`.

`BETTER_AUTH_SECRET` exists only in Convex's environment. The bridge secret must
match in Convex and the Worker; never prefix it with `VITE_` or `NEXT_PUBLIC_`.
The public Convex URLs may be browser-visible. In production, configure the same
URL/bridge/origin settings in the Worker and set Convex's `SITE_URL` to the deployed
app's exact origin. No production deployment is part of local setup.

Run `bun run dev` in a second terminal. All browser requests stay on `/api`;
Hono proxies auth and calls Convex with the session's JWT and the bridge credential.
The Convex mutations enforce ownership and atomically change interests/claims.
Do not call protected data functions directly from the browser or expose the bridge key.

Workers AI has no local inference engine. To exercise real model calls locally,
authenticate the Cloudflare CLI, set `WORKERS_AI_REMOTE=true` in the environment
that launches Vite, and restart `bun run dev`. Calls may incur Workers AI charges.
Without opt-in, analysis returns 503 rather than fabricated data. Only authorized
requester/profile requests can invoke models.

The old SQL files in `migrations/` are retained only as migration references.
They no longer run and D1 is not bound to the app. Existing local D1 files are
untouched. The selected Convex development deployment started empty; importing
any existing production data requires a separate, reviewed migration.

## Browser QA console

Run `bun run dev --host 127.0.0.1` and open `/debug` on the printed local
origin. The console includes:

- Email/password sign-up, sign-in, role selection and sign-out using real cookies.
- Searchable request presets for every application endpoint, with editable JSON,
  query parameters, and opportunity/developer ID context.
- HTTP status, elapsed time, cache headers, raw JSON, validation errors and match
  score cards. Returned IDs can be reused without retyping them.
- A ten-response in-memory history and redacted JSON copying. Passwords and
  token/secret/cookie fields are removed; other profile and project data remain
  visible. Signing in or out clears the previous history. Nothing is saved to
  localStorage, and there is no auth bypass or privileged debug API.

Requests change the connected database. Use test accounts and separate browser
profiles/private windows to exercise different roles. The page is not an admin
dashboard: all calls retain backend authorization, including expected 401, 403,
400 and 409 failures. It is marked `noindex`, but remains a public web route;
restrict access at deployment if the console should not be publicly reachable.

Use the local setup above first. Without remote Workers AI, valid profile saves
and job posts return 503, with no partial persistence. This console does not seed
fake data or substitute models. `QA walkthrough` on the page covers the matching
and mutual-interest flow when AI is available.

## HTTP contract

Developer and Requester are the only account roles. Legacy `company` and
`recruiter` values are accepted only when reading existing Convex member rows;
they resolve to Requester without changing user IDs, postings, or ownership.
New role selections reject those legacy values. Stored interest columns retain
their old names for compatibility, but the API exposes `requesterInterested` and
`requesterName`.

Browser requests use a Better Auth session cookie from the same origin with
`credentials: "include"`. Native requests use a signed bearer session from the
`set-auth-token` authentication response header, stored in Keychain, and send the
configured site origin in `Origin`. Both use the same facade and authorization.
The public map accepts either session type optionally. Convex JWTs and the bridge
credential remain server-side. JSON bodies use `Content-Type: application/json`.
Errors return `{ "error": "..." }`; validation errors also
include field paths under `issues`. Better Auth routes use its native error shape.

| Method | Path                              | Caller and response                                                                  |
| ------ | --------------------------------- | ------------------------------------------------------------------------------------ |
| POST   | `/api/auth/sign-up/email`         | `{name,email,password}`; minimum 12-character password, sets session cookie          |
| POST   | `/api/auth/sign-in/email`         | `{email,password}`, sets session cookie                                              |
| POST   | `/api/auth/sign-out`              | Ends current session                                                                 |
| GET    | `/api/auth/get-session`           | Better Auth session                                                                  |
| GET    | `/api/me`                         | Own ID, name and selected role                                                       |
| PUT    | `/api/me/role`                    | `{role:"developer"\|"requester"}`; one-time, retry-safe                              |
| PUT    | `/api/developers/me`              | Developer: save the complete profile and embed its experience                        |
| GET    | `/api/developers/me`              | Developer: own profile and location, including when undiscoverable                   |
| PATCH  | `/api/developers/me`              | Developer: `{available?:boolean,discoverable?:boolean}` without AI calls             |
| PATCH  | `/api/developers/me/location`     | Developer: `{latitude,longitude,radiusKm?}` without AI calls                         |
| PATCH  | `/api/developers/me/preferences`  | Developer: replace experience, pay and work-arrangement preferences without AI calls |
| GET    | `/api/developers`                 | Requester: consented profiles and project evidence                                   |
| GET    | `/api/developers/:id`             | Requester: profile only while still discoverable; never private area                 |
| POST   | `/api/opportunities`              | Requester: analyze, embed, and persist a new opportunity; returns 201                |
| GET    | `/api/map`                        | Public: Calgary map listings, precision depending on viewer (see map guide)          |
| GET    | `/api/opportunities`              | Open opportunities and structured analyses                                           |
| GET    | `/api/opportunities/mine`         | Requester: own opportunities, open and closed, paginated                             |
| PUT    | `/api/opportunities/:id`          | Owner: replace details; re-analyses and re-embeds; status unchanged                  |
| GET    | `/api/opportunities/:id`          | Opportunity detail                                                                   |
| PATCH  | `/api/opportunities/:id`          | Owner: `{status:"open"\|"closed"}`                                                   |
| GET    | `/api/opportunities/:id/matches`  | Owner: ranked developers, score breakdowns, explanations, weights and version        |
| GET    | `/api/opportunities/:id/match`    | Developer: own match or null, eligibility reasons and opportunity status             |
| PUT    | `/api/opportunities/:id/interest` | Developer: `{interested:boolean}`; owner: additionally supply `developerId`          |
| GET    | `/api/connections`                | Participant's mutual-interest connections, scoped to opportunities                   |
| POST   | `/api/requests`                   | Requester: analyze, embed, and post a local request with a pin; returns 201          |
| GET    | `/api/requests`                   | Requester: own requests, including claimant name when claimed                        |
| GET    | `/api/requests/claimed`           | Developer: requests they have accepted, paginated                                    |
| PUT    | `/api/requests/:id`               | Requester owner: replace details while open (409 when claimed or closed)             |
| GET    | `/api/requests/nearby`            | Developer: ranked open requests inside the saved radius                              |
| GET    | `/api/requests/:id`               | Requester owner, or developer for open/own claimed request                           |
| PATCH  | `/api/requests/:id`               | Requester: `{status:"closed"}`                                                       |
| POST   | `/api/requests/:id/accept`        | Developer: exclusive claim while status is open; retry-safe for same claimant        |
| POST   | `/api/requests/:id/release`       | Claimant or requester: return a claimed request to open                              |

`GET /api/interests` lists a participant's pending and mutual interests, including
both consent flags and `connected`. It uses the same pagination as connections.
Both reads optionally accept `opportunityId` to scope results without scanning
only the first page of unrelated interests.

Native posting clients may send `Idempotency-Key` with a UUID on request and
opportunity creation. The ID is namespaced to the authenticated user. Convex
atomically returns the existing posting on an identical retry and rejects reuse
with different details. Analysis still runs before persistence, so inference
outages can return 503 on a retry without creating another posting.

Profile and posting reads include a numeric `revision`. Full profile saves and
posting edits optionally accept `If-Match: "<revision>"`; stale edits return 409
without overwriting current data. Existing web callers can omit the precondition.
Native clients preserve their draft and ask before discarding it to reload.

Browse and connection responses are `{data: [...], nextCursor: string|null}`.
Pass `?after=<nextCursor>&limit=20` for the next page; limits are 1-100. Match
rankings accept `?limit=20` (no cursor) and return `{data,total,weights,version}`.
Request a larger limit to see more of the ranked pool, up to 100. Factor scores
and overall match scores are percentages, not probabilities of hiring success.
Opportunity browsing also accepts `city` (case-insensitive, includes remote jobs)
and `kind=paid` or `kind=volunteer`.

### Developer profile

`PUT /api/developers/me` replaces the core profile; omitted required fields are errors.
The optional matching-preference fields are preserved when older clients omit
them, and can be explicitly cleared with `null`.
Skill proficiency and experience levels run from 1 to 5. `discoverable` is explicit
consent to requester discovery; `available` controls new matching.
Use `PATCH /api/developers/me` to change these flags without invoking AI, even
when the model service is unavailable.

Use `PATCH /api/developers/me/preferences` to save all three preference fields
without regenerating embeddings. `null` means unknown or cleared, not zero:

```json
{
  "professionalExperienceYears": 0,
  "compensationPreference": {
    "currency": "CAD",
    "minimumHourlyRate": 20,
    "preferredHourlyRate": 30
  },
  "workArrangementPreference": {
    "preferred": "remote",
    "required": false
  }
}
```

Years accept zero and fractional values. Rates are nonnegative; when both are
provided, the preferred rate must be at least the minimum. Work arrangements are
`remote`, `hybrid`, `onsite`, or `flexible`; a flexible preference cannot also be
required. Preferences are visible to requesters only through the
existing discovery-consent rules. The additive Convex schema supports existing
records without a data migration; sync it to the development deployment before
using the new mutation.

```json
{
  "bio": "I build community websites with React.",
  "city": "Toronto",
  "skills": [{ "name": "react", "level": 3 }],
  "projects": [
    {
      "title": "Garden site",
      "description": "A community garden website with accessible forms.",
      "technologies": ["react"]
    }
  ],
  "interests": ["community", "sustainability"],
  "wantsToLearn": ["typescript", "accessibility"],
  "experienceLevel": 1,
  "collaboration": "async",
  "weeklyHours": 10,
  "acceptsVolunteer": true,
  "available": true,
  "discoverable": true
}
```

### Opportunity

`essentialTechnologies` are the requester's explicit non-negotiable gates. Use an
empty array when willing to consider transferable experience. `kind` distinguishes
paid contracts from volunteer experience; no payment processing is implied.
`collaboration` accepts `async`, `sync`, or `flexible` on both input types.

```json
{
  "title": "Community garden website",
  "description": "Build an accessible React website for a community garden. TypeScript preferred. A senior volunteer provides weekly mentorship.",
  "city": "Toronto",
  "remote": false,
  "kind": "volunteer",
  "essentialTechnologies": ["react"],
  "minimumWeeklyHours": 5,
  "collaboration": "async",
  "interests": ["community", "sustainability"]
}
```

Analysis returns required/preferred technologies, difficulty (1-5), experience
level (`beginner`, `intermediate`, `advanced`), required skills, responsibilities,
learning opportunities, and mentorship availability. It is an estimate: have the
requester review it before acting on a recommendation. This MVP does not yet offer
an analysis editing endpoint.

Interest responses include `requesterInterested`, `developerInterested`, and
`connected`. Retrying changes only the caller's flag. A connection exists only
while both flags are true; either party can withdraw even after opportunity close.
Closing an opportunity stops new interest and matching, but preserves existing
connections. Browsing matches alone never creates interest or a connection.

Opportunities accept optional listing fields: `compensation` and `commitment`
(each up to 80 characters), and a map pin given as `place`, `latitude` and
`longitude` together (all three or none). Unpinned opportunities stay off the map.
Edits replace the whole record and re-run analysis, so they return 503 and save
nothing when Workers AI is unavailable.

Nothing is deleted through the API yet. Requests close and opportunities close or
reopen; archive-versus-delete policy and account deletion await a product decision.

### Local request

Requester posts are unpaid neighborhood problems. Analysis reuses the opportunity
pipeline. Developer coordinates live on the `developer` row and never appear in
requester browse responses. Default radius is 25 km (1-100). Nearby browse
prefilters with a bounding box, applies haversine distance, then ranks with the
growth matcher. Local requests skip opportunity essential-technology gates.

```json
{
  "title": "Community garden website",
  "description": "Need help building an accessible React website for our neighborhood garden plot.",
  "place": "Toronto Downtown",
  "latitude": 43.6532,
  "longitude": -79.3832
}
```

## Verification

```sh
bun run check
bun run build
bun run smoke
```

Normal tests run offline with `convex-test`, the real Better Auth component schema,
and seeded test sessions. They cover access control, privacy, matching, interest,
and atomic claims. The live suite separately bundles Hono into workerd and uses
real cloud Convex auth and storage, substituting only the model-service boundary.

To run it against a disposable development deployment, set Convex `DEV_SITE_URL`
to `http://127.0.0.1:5180`, enable `ALLOW_TEST_CLEANUP=true` there, then run
`bun run test:live`. It creates reserved `@example.test` accounts and removes
their records through an operator-only internal function. Do not enable cleanup
in production. Normal `check`, `build`, and `smoke` never push Convex functions.
The public health endpoint stays a minimal liveness check, not a connectivity test.
Live Workers AI inference still requires Cloudflare credentials and explicit opt-in.

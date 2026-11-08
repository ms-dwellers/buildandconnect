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
`.env.local`. Setup adds `SITE_URL`, preserving Mapbox and other settings.
It reuses existing development secrets rather
than rotating them. The script refuses production selections and deploy keys.
An optional argument changes the local origin: `bun run setup:backend http://localhost:5173`.

`BETTER_AUTH_SECRET` exists only in Convex's environment. No bridge secret or
Convex JWT exchange is needed by the application. The public Convex URLs may be
browser-visible. Set Convex's `SITE_URL` to the website's exact origin. The web
host needs only that origin and `VITE_CONVEX_SITE_URL` for forwarding. No
production deployment is part of local setup.

### Social sign-in (Google and GitHub)

Provider credentials live only in the Convex deployment environment as
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, and
`GITHUB_CLIENT_SECRET`. A provider's button appears only when both of its values
are set; deployments without them keep email/password sign-in. Set them with
`bunx convex env set NAME` (the value is read from stdin), or export them in the
shell before `bun run setup:backend`, which copies any that are present. Never put
them in `.env.local`; the website host does not use them.

Better Auth runs behind the same-origin forwarding route with `baseURL = SITE_URL`,
so the callback URL to register with each provider is `SITE_URL` plus
`/api/auth/callback/google` or `/api/auth/callback/github`; locally that is
`http://127.0.0.1:5173/api/auth/callback/google`. Register the production origin
separately. GitHub OAuth Apps accept one callback URL each and ignore the port on
`127.0.0.1`, so use one app per environment. Always open the app at the exact
`SITE_URL` origin: Better Auth's state cookie is bound to that host, so mixing
`localhost` and `127.0.0.1` fails with `state_mismatch`.

`GET /api/auth-providers` returns `{google, github}` booleans so the sign-in form
shows only configured providers. New social accounts have no role and land on
`/role`. An existing email/password account with the same email is not linked
automatically (its email is unverified); the person returns to the sign-in page
with `?error=account_not_linked` and a plain-language explanation. OAuth tokens
are encrypted at rest.

Run `bun run dev` in a second terminal for the website. Browser requests stay on
`/api`, forwarded without application logic to Convex HTTP actions. Native apps
call `https://<deployment>.convex.site/api/...` directly and do not need the website
or Vite running. Use the HTTP `.convex.site` URL, not the `.convex.cloud` RPC URL.
Internal Convex functions enforce live sessions, ownership, roles, and atomic
transitions. Clients cannot call them or submit trusted analysis/embeddings.

Convex calls Workers AI through REST; there is no Worker AI binding. Set
`WORKERS_AI_ACCOUNT_ID` and a minimally scoped `WORKERS_AI_API_TOKEN` only in the
Convex environment, plus `WORKERS_AI_ENABLED=true` to opt into billable inference.
Neither provider credential belongs in web settings, `.xcconfig`, or client code.
Without opt-in, analysis returns 503 rather than fabricated data. Only authorized
profile/posting requests can invoke models.

## Deployment

Deploy the Convex schema, functions, and HTTP actions to the chosen environment.
Configure `BETTER_AUTH_SECRET`, `SITE_URL` (the website origin, or the Convex HTTP
origin for native-only use), and optional AI credentials
there. Native apps can then use the deployment's HTTPS HTTP site without any
application Worker deployment. Deploy the website separately only if needed; its
same-origin forwarding route requires `VITE_CONVEX_SITE_URL` and `SITE_URL`, no
application secrets. Retire old bridge-secret configuration after migrating all
clients. Do not point new clients at an old deployment that lacks these actions.
For an existing website, deploy its new forwarding route in the same rollout, or
use a fresh staging Convex deployment first. The old application API cannot call
the newly internal persistence functions. Native-only deployments do not need a
website, but an old deployed website is not automatically migrated by a Convex push.

The old SQL files in `migrations/` are retained only as migration references.
They no longer run and D1 is not bound to the app. Existing local D1 files are
untouched. The selected Convex development deployment started empty; importing
any existing production data requires a separate, reviewed migration.

## Browser QA console

Run `bun run dev --host 127.0.0.1` and open `/debug` on the printed local
origin. The console includes:

- Email/password and Google/GitHub sign-in, sign-up, role selection and sign-out
  using real cookies. Provider sign-in returns to `/debug`; choose the role
  afterwards with the console's role button.
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
The public map accepts either session type optionally. Session credentials remain
private. JSON bodies use `Content-Type: application/json`.
Errors return `{ "error": "..." }`; validation errors also
include field paths under `issues`. Better Auth routes use its native error shape.

| Method | Path                              | Caller and response                                                                  |
| ------ | --------------------------------- | ------------------------------------------------------------------------------------ |
| POST   | `/api/auth/sign-up/email`         | `{name,email,password}`; minimum 12-character password, sets session cookie          |
| POST   | `/api/auth/sign-in/email`         | `{email,password}`, sets session cookie                                              |
| POST   | `/api/auth/sign-out`              | Ends current session                                                                 |
| GET    | `/api/auth/get-session`           | Better Auth session                                                                  |
| POST   | `/api/auth/sign-in/social`        | `{provider:"google"                                                                  | "github",callbackURL?,newUserCallbackURL?,errorCallbackURL?}`; returns `{url}` to visit |
| GET    | `/api/auth-providers`             | Public: `{google:boolean,github:boolean}`, which providers have credentials          |
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
and atomic claims. HTTP tests run the actual Convex action handlers and Better Auth
with scripted model services, covering both browser cookies and native tokens.

For a direct-HTTP smoke test against a disposable development deployment, enable
`ALLOW_TEST_CLEANUP=true` there, then run `bun run test:live`. It creates reserved
`@example.test` accounts and removes
their records through an operator-only internal function. Do not enable cleanup
in production. Normal `check`, `build`, and `smoke` never push Convex functions.
The public health endpoint stays a minimal liveness check, not a connectivity test.
Live Workers AI inference still requires Cloudflare credentials and explicit opt-in.

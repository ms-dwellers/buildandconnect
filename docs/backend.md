# Backend API

## Local setup

Use the repository's Bun and Node.js 26 toolchain and run `bun install --frozen-lockfile`. Initialize the local
database with:

```sh
bun run db:migrate:local
```

This command only touches `.wrangler/state/`. Dev and preview use the same path.
The local database uses the reserved placeholder ID in `cloudflare.config.ts`;
leave `D1_DATABASE_ID` unset locally. For deployment, set it to the real database
UUID before building. Do not deploy with the placeholder ID.

Create an ignored `.dev.vars` with private permissions, set `SITE_URL` to the
exact local origin printed by Vite, and generate a random `BETTER_AUTH_SECRET`
of at least 32 characters. Never commit either value or put them in public vars.
The landing page and health endpoint need neither value, but account/API requests
do. Both settings are Worker secrets in production.

Workers AI has no local inference engine. To exercise real model calls locally,
authenticate the Cloudflare CLI, set `WORKERS_AI_REMOTE=true` in the environment
that launches Vite, and restart `bun run dev`. Calls may incur Workers AI charges.
Without opt-in, analysis returns 503 rather than fabricated data. Only authorized
company/profile requests can invoke models.

For an approved deployment, create the D1 database in Cloudflare, record its UUID
in the build environment, apply `migrations/` using
`cf d1 migrations apply <database-uuid> --dir migrations`, and configure Worker
secrets before publishing. This task does not deploy or create remote resources.

## HTTP contract

All application endpoints below require a Better Auth session cookie. Fetch from
the same origin with `credentials: "include"`. JSON bodies use `Content-Type:
application/json`. Errors return `{ "error": "..." }`; validation errors also
include field paths under `issues`. Better Auth routes use its native error shape.

| Method | Path                              | Caller and response                                                             |
| ------ | --------------------------------- | ------------------------------------------------------------------------------- |
| POST   | `/api/auth/sign-up/email`         | `{name,email,password}`; minimum 12-character password, sets session cookie     |
| POST   | `/api/auth/sign-in/email`         | `{email,password}`, sets session cookie                                         |
| POST   | `/api/auth/sign-out`              | Ends current session                                                            |
| GET    | `/api/auth/get-session`           | Better Auth session                                                             |
| GET    | `/api/me`                         | Own ID, name and selected role                                                  |
| PUT    | `/api/me/role`                    | `{role:"developer"\|"company"\|"recruiter"\|"requester"}`; one-time, retry-safe |
| PUT    | `/api/developers/me`              | Developer: save the complete profile and embed its experience                   |
| GET    | `/api/developers/me`              | Developer: own profile and location, including when undiscoverable              |
| PATCH  | `/api/developers/me`              | Developer: `{available?:boolean,discoverable?:boolean}` without AI calls        |
| PATCH  | `/api/developers/me/location`     | Developer: `{latitude,longitude,radiusKm?}` without AI calls                    |
| GET    | `/api/developers`                 | Company/recruiter: consented profiles and project evidence                      |
| POST   | `/api/opportunities`              | Company: analyze, embed, and persist a new opportunity; returns 201             |
| GET    | `/api/opportunities`              | Open opportunities and structured analyses                                      |
| GET    | `/api/opportunities/:id`          | Opportunity detail                                                              |
| PATCH  | `/api/opportunities/:id`          | Owner: `{status:"open"\|"closed"}`                                              |
| GET    | `/api/opportunities/:id/matches`  | Owner: ranked developers, score breakdowns, explanations, weights and version   |
| GET    | `/api/opportunities/:id/match`    | Developer: own match or null, eligibility reasons and opportunity status        |
| PUT    | `/api/opportunities/:id/interest` | Developer: `{interested:boolean}`; owner: additionally supply `developerId`     |
| GET    | `/api/connections`                | Participant's mutual-interest connections, scoped to opportunities              |
| POST   | `/api/requests`                   | Requester: analyze, embed, and post a local request with a pin; returns 201     |
| GET    | `/api/requests`                   | Requester: own requests, including claimant name when claimed                   |
| GET    | `/api/requests/nearby`            | Developer: ranked open requests inside the saved radius                         |
| GET    | `/api/requests/:id`               | Requester owner, or developer for open/own claimed request                      |
| PATCH  | `/api/requests/:id`               | Requester: `{status:"closed"}`                                                  |
| POST   | `/api/requests/:id/accept`        | Developer: exclusive claim while status is open; retry-safe for same claimant   |
| POST   | `/api/requests/:id/release`       | Claimant or requester: return a claimed request to open                         |

`GET /api/interests` lists a participant's pending and mutual interests, including
both consent flags and `connected`. It uses the same pagination as connections.

Browse and connection responses are `{data: [...], nextCursor: string|null}`.
Pass `?after=<nextCursor>&limit=20` for the next page; limits are 1-100. Match
rankings accept `?limit=20` (no cursor) and return `{data,total,weights,version}`.
Request a larger limit to see more of the ranked pool, up to 100. Factor scores
and overall match scores are percentages, not probabilities of hiring success.
Opportunity browsing also accepts `city` (case-insensitive, includes remote jobs)
and `kind=paid` or `kind=volunteer`.

### Developer profile

`PUT /api/developers/me` replaces the entire profile; omitted fields are errors.
Skill proficiency and experience levels run from 1 to 5. `discoverable` is explicit
consent to recruiter/company discovery; `available` controls new matching.
Use `PATCH /api/developers/me` to change these flags without invoking AI, even
when the model service is unavailable.

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

`essentialTechnologies` are the company's explicit non-negotiable gates. Use an
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
company review it before acting on a recommendation. This MVP does not yet offer
an analysis editing endpoint.

Interest responses include `companyInterested`, `developerInterested`, and
`connected`. Retrying changes only the caller's flag. A connection exists only
while both flags are true; either party can withdraw even after opportunity close.
Closing an opportunity stops new interest and matching, but preserves existing
connections. Browsing matches alone never creates interest or a connection.

### Local request

Requester posts are unpaid neighborhood problems. Analysis reuses the opportunity
pipeline. Developer coordinates live on the `developer` row and never appear in
company/recruiter browse responses. Default radius is 25 km (1-100). Nearby browse
prefilters with a bounding box, applies haversine distance, then ranks with the
growth matcher. Local requests skip company essential-technology gates.

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

`tests/backend.test.ts` bundles the actual Hono API into workerd and drives HTTP
signup, roles, profiles, job creation, ranking, discovery, mutual interest,
withdrawal, logout and cross-account authorization with real D1 and Better Auth.
Only the model-service boundary is replaced with deterministic fixtures, never
authentication or SQL. `tests/matching.test.ts` exercises scoring and eligibility.
The preview smoke test checks that Vinext mounts the protected backend correctly.
Live model inference requires credentials and is not claimed by these tests.

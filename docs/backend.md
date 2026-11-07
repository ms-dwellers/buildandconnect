# Backend API

## Local setup

Use the repository's Node.js 26 toolchain and run `npm ci`. Initialize the local
database with:

```sh
npm run db:migrate:local
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
that launches Vite, and restart `npm run dev`. Calls may incur Workers AI charges.
Without opt-in, analysis returns 503 rather than fabricated data. Only authorized
company/profile requests can invoke models.

For an approved deployment, create the D1 database in Cloudflare, record its UUID
in the build environment, apply `migrations/` using
`cf d1 migrations apply <database-uuid> --dir migrations`, and configure Worker
secrets before publishing. This task does not deploy or create remote resources.

## Browser QA console

Run `npm run dev -- --host 127.0.0.1` and open `/debug` on the printed local
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

All application endpoints below require a Better Auth session cookie. Fetch from
the same origin with `credentials: "include"`. JSON bodies use `Content-Type:
application/json`. Errors return `{ "error": "..." }`; validation errors also
include field paths under `issues`. Better Auth routes use its native error shape.

| Method | Path                              | Caller and response                                                           |
| ------ | --------------------------------- | ----------------------------------------------------------------------------- |
| POST   | `/api/auth/sign-up/email`         | `{name,email,password}`; minimum 12-character password, sets session cookie   |
| POST   | `/api/auth/sign-in/email`         | `{email,password}`, sets session cookie                                       |
| POST   | `/api/auth/sign-out`              | Ends current session                                                          |
| GET    | `/api/auth/get-session`           | Better Auth session                                                           |
| GET    | `/api/me`                         | Own ID, name and selected role                                                |
| PUT    | `/api/me/role`                    | `{role:"developer"\|"company"\|"recruiter"}`; one-time selection, retry-safe  |
| PUT    | `/api/developers/me`              | Developer: save the complete profile and embed its experience                 |
| GET    | `/api/developers/me`              | Developer: own profile, including when undiscoverable                         |
| PATCH  | `/api/developers/me`              | Developer: `{available?:boolean,discoverable?:boolean}` without AI calls      |
| GET    | `/api/developers`                 | Company/recruiter: consented profiles and project evidence                    |
| POST   | `/api/opportunities`              | Company: analyze, embed, and persist a new opportunity; returns 201           |
| GET    | `/api/opportunities`              | Open opportunities and structured analyses                                    |
| GET    | `/api/opportunities/:id`          | Opportunity detail                                                            |
| PATCH  | `/api/opportunities/:id`          | Owner: `{status:"open"\|"closed"}`                                            |
| GET    | `/api/opportunities/:id/matches`  | Owner: ranked developers, score breakdowns, explanations, weights and version |
| GET    | `/api/opportunities/:id/match`    | Developer: own match or null, eligibility reasons and opportunity status      |
| PUT    | `/api/opportunities/:id/interest` | Developer: `{interested:boolean}`; owner: additionally supply `developerId`   |
| GET    | `/api/connections`                | Participant's mutual-interest connections, scoped to opportunities            |

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

## Verification

```sh
npm run check
npm run build
npm run smoke
```

`tests/backend.test.ts` bundles the actual Hono API into workerd and drives HTTP
signup, roles, profiles, job creation, ranking, discovery, mutual interest,
withdrawal, logout and cross-account authorization with real D1 and Better Auth.
Only the model-service boundary is replaced with deterministic fixtures, never
authentication or SQL. `tests/matching.test.ts` exercises scoring and eligibility.
The preview smoke test checks that Vinext mounts the protected backend correctly.
Live model inference requires credentials and is not claimed by these tests.

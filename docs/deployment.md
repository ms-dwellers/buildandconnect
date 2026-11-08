# Production frontend

The Vinext frontend runs on Cloudflare Workers at
<https://buildandconnect.work> in the **rocky.systems** account. It serves static
assets and forwards `/api` requests to Convex. It does not deploy Convex, create
a database, or copy backend provider credentials into Cloudflare.

## Deploy locally

Use Node.js 26 and the Bun version in `package.json`.

```sh
bun install --frozen-lockfile
bun run cf auth create rocky-systems
bun run cf auth activate rocky-systems
```

Create an ignored `.env.production.local` with private file permissions. Set:

| Variable                          | Value                                                            |
| --------------------------------- | ---------------------------------------------------------------- |
| `CLOUDFLARE_ACCOUNT_ID`           | The rocky.systems account owning the domain                      |
| `VITE_CONVEX_SITE_URL`            | The selected backend's HTTPS `.convex.site` origin               |
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | A public `pk.` token permitted on `https://buildandconnect.work` |

Do not copy the development environment wholesale. In particular, no Better
Auth, AI, voice, Convex deploy, or Cloudflare API credentials belong in public
variables. Local deployment uses the selected `cf` OAuth profile.

```sh
bun run fmt:check
bun run typecheck
bun run deploy:production --dry-run
bun run deploy:production
```

The deployment command verifies account ownership of the active domain and
backend health, builds fresh production output, then deploys with `cf`.
`cloudflare.config.ts` owns the custom domain; Cloudflare provisions its DNS and
certificate. Production always forwards the canonical HTTPS origin, not a
developer's local `SITE_URL`.

## GitHub Actions

`.github/workflows/frontend.yml` checks formatting, types, and the Workers build
on pull requests and pushes to `main`. It deliberately does not run tests.
Successful checks on `main` deploy through the GitHub **production** environment.
Manual runs can deploy only when run against `main`. Production runs are
serialized; pull request runs can be cancelled when superseded.

Configure the production environment with:

- Variables: `CLOUDFLARE_ACCOUNT_ID`, `VITE_CONVEX_SITE_URL`.
- Secrets: `CLOUDFLARE_API_TOKEN`, `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`.

Use a dedicated Cloudflare deployment token scoped to the rocky.systems account
and the `buildandconnect.work` zone. Grant Workers Scripts edit and the account,
zone, and Workers routing permissions required by `cf deploy`. Do not use a
Global API Key or copy the local OAuth token into GitHub. Pull requests have no
access to deployment secrets. Action versions are pinned by commit.

The deploy step rebuilds with production configuration, so the secret-free CI
build is never accidentally published. It then checks the live health endpoint.
There is no parallel Cloudflare Builds trigger; keep one deployment owner to
avoid competing production updates.

## Backend and sign-in

Select the Convex deployment explicitly before configuring the frontend.
A development backend is not automatically promoted by deploying the website.
In the selected backend, `SITE_URL` must be `https://buildandconnect.work` for
production browser authentication. Preserve an approved development origin in
`DEV_SITE_URL` if the backend is intentionally shared. Google and GitHub OAuth
applications also need the canonical production callback URLs. Provider
credentials stay in Convex.

`/api/health` proves the frontend is running, not that Convex or sign-in works.
After release, also verify `/api/auth-providers`, `/api/map`, and a normal sign-in.
The Mapbox token must permit the production origin or maps will not load.

## Rollback

Revert the faulty application change on `main` using the team's jj workflow and
let the same pipeline deploy the corrected revision. For an urgent rollback,
use the Worker's deployment history in Cloudflare, then reconcile `main` before
its next deployment. Rolling back the frontend does not roll back Convex data
or schema changes.

# Architecture

## Ownership

| Concern                                | Owner                              | Current state                          |
| -------------------------------------- | ---------------------------------- | -------------------------------------- |
| Pages and UI                           | React, Vinext App Router, Tailwind | Landing page                           |
| Hosting and server rendering           | Cloudflare Workers                 | Configured for local build and preview |
| Application data and real-time updates | Convex                             | Planned                                |
| Authentication                         | Better Auth + Convex component     | Planned                                |
| Maps and location display              | Mapbox GL JS                       | Planned                                |
| Uploads and object storage             | Cloudflare R2                      | Add when needed                        |
| Background work                        | Cloudflare Queues / Workflows      | Add when needed                        |
| Stateful coordination beyond Convex    | Cloudflare Durable Objects         | Add only for a concrete need           |
| Native mobile client                   | Swift for iOS                      | Deferred; no Linux build               |

`app/` owns web routes and UI. `app/api/health` reports only web liveness, not
Convex or provider readiness. Add application tables and backend functions under
`convex/` when implementing the first data-backed feature. Do not commit generated
credentials, invent schemas prematurely, or add a redundant Hono server.

## Convex and Better Auth integration

1. Choose the Convex project/deployment with the team before creating resources.
2. Follow the [Convex setup](https://docs.convex.dev/quickstart/react) and install
   `convex` for the first data-backed feature. Run the project-local `convex dev`
   CLI to configure the deployment and generate typed APIs.
3. Follow the [official Convex + Better Auth guide](https://labs.convex.dev/better-auth)
   and its [Next.js guide](https://labs.convex.dev/better-auth/framework-guides/next).
   Install the compatible `better-auth` and `@convex-dev/better-auth` versions from
   that guide. Vinext implements the App Router APIs but is not Next.js; verify
   session cookies, server authentication, and route-handler forwarding in workerd.
4. Mount the client provider in a dedicated client component; keep the root layout
   server-rendered. Use generated Convex references instead of string API names.
5. Put `BETTER_AUTH_SECRET` and the approved `SITE_URL` in the Convex deployment's
   environment. Add the public Convex cloud and HTTP site URLs to the web
   environment; they are endpoints, not secrets. Never interchange the two URLs.
6. Authorize queries, mutations, actions, and uploads at the backend boundary.
   Hidden UI and route middleware are not authorization. Test signed-out access,
   session expiry, and cross-user isolation before treating auth as complete.

Provider callbacks, login methods, account roles, and project permissions remain
product decisions. No auth endpoints or dummy credentials are configured yet.

## Mapbox

Install `mapbox-gl` when a map is implemented. Load it in a client component with
its stylesheet, not in server code. Use `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` only for
a least-privilege **public** token with URL restrictions, never a secret token.
Public tokens are browser-visible by design; keep their values out of tracked
files regardless. See [Mapbox access tokens](https://docs.mapbox.com/help/dive-deeper/access-tokens/).
Decide location precision and consent before displaying developers on a map.

## Cloudflare

`cloudflare.config.ts` declares the Worker and static assets;
`vite.config.ts` runs App Router server code in workerd. There is no shared page
cache or image-optimization binding yet, avoiding premature caching of future
personalized responses and unnecessary service provisioning. Add service bindings
only when a feature requires them.

The `cf` CLI manages the generated `.cloudflare/` output. Authenticate interactively
or use an appropriately scoped `CLOUDFLARE_API_TOKEN` through the environment. Set
`CLOUDFLARE_ACCOUNT_ID` through local/deployment configuration. Use the provider's
secret store for runtime secrets; `.env.local` is not a production secret store.

Read [Vinext's Cloudflare guide](https://vinext.dev/docs/deploying/cloudflare) before
deploying or changing bindings. No Cloudflare resources have been provisioned by
this scaffold.

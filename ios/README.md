# iPhone app

Native SwiftUI client for the shared Hono API, Better Auth, Convex, Workers AI,
and Mapbox. Minimum iOS 18; native Liquid Glass controls are used on iOS 26 and
later. No application database or server credential is bundled with the app.

## Build and run

Use macOS with Xcode, an installed iOS Simulator runtime, XcodeGen, and the
repository's Node/Bun toolchain. These tools are not required for web development.

```sh
bun run ios:generate
open ios/BuildConnect.xcodeproj
```

The generated Xcode project and Info.plist are ignored. Edit `project.yml` rather
than generated project files. Swift Package Manager resolves the pinned Mapbox
SDK and its dependencies.

The garden artwork is rendered from the actual web `CommunityGarden` component
using the web semantic colors. To update the bundled PNG and app icon after an
artwork change, run `bun run ios:artwork` with `resvg` installed. Do not hand-edit
the generated images. Fonts and their licenses are reused from `public/fonts/`.

Create an ignored `ios/Local.xcconfig` for this machine, with private file
permissions. `Configuration.xcconfig` includes it optionally:

```xcconfig
API_BASE_URL = https:/$()/your-deployed-app.example
MAPBOX_PUBLIC_TOKEN =
```

Set the public Mapbox token locally. Never place a Better Auth secret, Convex
bridge secret, account key, or Mapbox secret token in this file or an Xcode build
setting. Public runtime tokens are extractable from mobile apps; browser
URL-restricted tokens may not work on iOS. With no usable token, Explore retains
its project list and the pin picker supports manual coordinates.

Debug defaults to `http://127.0.0.1:5173`, which reaches the Mac from the simulator.
A physical iPhone needs a reachable HTTPS server, signing team, and provisioning.
Release requests reject HTTP. Simulator builds use local ad-hoc signing so
Keychain is exercised normally. No server is published by the build scripts.

```sh
bun run ios:fmt
bun run ios:fmt:check
bun run ios:build
bun run ios:test
```

The test task chooses a booted iPhone, or the first installed iPhone simulator.
Set `IOS_SIMULATOR_ID` to choose another. Xcode results are under
`ios/.build/Logs/Test/`. Role walkthroughs attach screenshots without capturing
authentication forms.

## Connected pathways

- Guest welcome and Calgary browsing; authentication returns to a pending posting.
- Email/password sign-up and sign-in, one-time role choice, session restoration,
  and server sign-out. Native credentials are signed bearer sessions in Keychain.
- Developer profile, skills, project evidence, learning preferences, independent
  availability/discovery flags, and a private pin/radius editor.
- Developer nearby requests, exclusive acceptance, release, opportunity fit,
  score breakdowns, eligibility recovery, and mutual interest.
- Requester creation, map placement, open-only editing, claimant management,
  release, closing, and closed owner history.
- Company creation/editing, optional pins, ranked candidates, close/reopen, and
  opportunity-specific interest/withdrawal.
- Recruiter read-only discovery and consent-revalidated developer profiles.
- Shared interest/connection lists, pagination, map/list selection, filters,
  3D selection flights, and reduced-motion cloud arrival.
- Debug-only local voice studio: scripted replies, device speech preview, and
  opt-in microphone amplitude processing. No recording, transcription, upload,
  remote AI conversation, or persistent transcript.

New-post and new-profile drafts use protected, backup-excluded local files.
Publication and explicit discard remove the corresponding draft; sign-out clears
the draft directory. Tokens never enter draft files. Editing existing records
keeps unsaved changes in screen state, not a second source of server truth.

New posting retries send a per-submission idempotency key. Convex atomically
deduplicates identical requests, rejecting changed content under a reused key.
The client never automatically queues offline claims or replays publication.

## Local end-to-end verification

`tests/native/server.mjs` is a loopback-only, opt-in test harness. It refuses cloud
deployments and requires anonymous local Convex on ports 3230/3231. It runs the
real Hono/auth/persistence pipeline; only Workers AI inference is substituted
using the existing test fixture. It creates fresh reserved-domain accounts and
keeps their randomly generated credentials in process memory.

1. In an isolated workspace, select an anonymous local Convex deployment with
   `CONVEX_AGENT_MODE=anonymous bunx convex dev --local-cloud-port 3230 --local-site-port 3231`.
2. Configure local Convex `BETTER_AUTH_SECRET`, `CONVEX_BRIDGE_SECRET`, and
   `SITE_URL=http://127.0.0.1:5199`. Keep the matching bridge secret in ignored
   `.env.local`; never print or commit it. Restart the local function push after
   initial configuration. Do not copy a cloud deployment's credentials.
3. Run `bun run ios:test:server`. It exposes the test-only context endpoint only
   on loopback and never belongs in a deployed Worker.
4. Run `bun run ios:test`. Native integration tests exercise signed sessions,
   map privacy, discovery, mutual interest, and claims; UI tests drive each role.

Without that server, integration and role tests explicitly skip; model and launch
tests still run. A skipped integration test is not evidence of backend parity.
Restart the harness with fresh accounts before repeating mutating walkthroughs.

## Deployment and product gates

The local backend changes must be deployed separately, with approval, before an
existing cloud deployment can issue native bearer sessions. Browser cookies and
origin checks remain enabled; native requests send the configured server origin.

The native router validates incoming hosts and handles opportunity and map-focus
URLs, but universal-link delivery still requires the team's real domain,
Associated Domains entitlement, and matching AASA configuration. Parser tests do
not establish that domain association or device signing works.

This is not yet App Store ready:

- Password-reset email is not configured. The app explains this and never claims
  to have sent a reset. An approved sender and callback domain are needed.
- Account deletion, content reporting/blocking, moderation operations, support
  contact, and retention/anonymization policies require product decisions and
  backend work. Closing a posting is not deletion.
- Connections currently mean mutual consent, not messaging or contact disclosure.
  No new communication/payment flow was invented.
- Closing a request clears its claimant in the current service. The owner sees
  closed history, but a former claimant does not have a persistent closure receipt.
  A minimal receipt needs an agreed retention/access policy.
- Real Workers AI inference, email delivery, physical-device mapping, accessibility
  assistive-technology checks, and production privacy disclosures need verification.

The app privacy manifest covers first-party profile, contact, location, and user
content processing. Review the merged SDK manifests and actual deployment behavior
when completing App Store privacy answers. Never submit development or fixture
data as production evidence.

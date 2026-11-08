# iPhone app

Native SwiftUI client for the Convex HTTP API, Better Auth, Workers AI,
and Mapbox. Minimum iOS 18. No application database or server credential is bundled
with the app.

The web design system is the visual source of truth: `app/globals.css`,
`components/ui/`, and `/design-system`. Native equivalents live in
`Sources/Core/Design.swift` and `Sources/Core/Controls.swift`. Colors follow
`feat/polish-sprint`'s white surfaces with pine, mint, coral, and supporting cream,
without merging that branch. Controls use bordered opaque surfaces, 10-point button corners,
and 3–4-point press travel. Primary, highlight, secondary, outline, ghost, and link
actions use the same hierarchy as the web. Navigation stays flat; app controls and
dialogs do not use Liquid Glass. System permission prompts remain OS-owned.
Shared inputs include focus rings, labeled form sections, whole-row switches,
and opaque sliders with native accessibility. Filter groups keep labels intact
and move whole buttons to another row when needed.
`AppPalette` scopes shared surfaces and controls like the web's CSS tokens. Voice
studio uses the isolated `.voice-studio` paper/moss palette from `app/globals.css`;
its backdrop, cards, fields, navigation, and actions do not change other screens.

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

The welcome landscape recomposes the website's actual `public/sprites/` artwork
for portrait. `bun run ios:artwork` renders these sprites, the supplied brand mark,
and the legacy garden/app icon with `resvg`. Do not hand-edit generated assets.
Fonts and their licenses are reused from `public/fonts/`.

Create an ignored `ios/Local.xcconfig` for this machine, with private file
permissions. `Configuration.xcconfig` includes it optionally:

```xcconfig
API_BASE_URL = https:/$()/your-deployment.convex.site
MAPBOX_PUBLIC_TOKEN =
```

Set the public Mapbox token locally. Never place a Better Auth secret, Convex
account key, or Mapbox secret token in this file or an Xcode build
setting. Public runtime tokens are extractable from mobile apps; browser
URL-restricted tokens may not work on iOS. With no usable token, Explore retains
its project list and the pin picker supports manual coordinates.

Set the Convex HTTP site explicitly; there is no localhost web-server default.
The `.convex.site` endpoint is different from the `.convex.cloud` RPC endpoint.
A deployed Convex HTTP site works directly from an iPhone without Vite, a web API
Worker, or a Mac-side terminal. A physical iPhone needs signing and provisioning.
Release requests reject HTTP. Simulator builds use local ad-hoc signing so
Keychain is exercised normally. No server is published by the build scripts.

To run on a physical iPhone, connect and trust it, open the generated project,
choose the BuildConnect scheme and your phone, then select your team under the
app target's Signing & Capabilities and press Command-R. Enable Developer Mode
on the phone if prompted. To retain signing across project regeneration, set
`DEVELOPMENT_TEAM` to your Apple team ID in ignored `Local.xcconfig`; do not edit
`project.yml` for a machine-specific team. The build/test scripts below target
the simulator, not a physical phone.

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

For registration walkthroughs on a simulator without iCloud Keychain, turn off
Settings > General > AutoFill & Passwords > AutoFill Passwords and Passkeys.
Otherwise iOS may intercept manual password input while attempting unsupported
strong-password generation. Production password-manager support stays enabled.

## Manual design previews

After building and installing the Debug app on a simulator, open the real profile,
onboarding, discovery, Explore sheets, request, account, and voice screens with fictional data:

```sh
SIMCTL_CHILD_BUILD_CONNECT_DESIGN_PREVIEW=1 xcrun simctl launch --terminate-running-process booted org.buildandconnect.iphone
```

`Sources/Core/DesignPreview.swift` intercepts application API requests in memory;
mutations are rejected and no live account is needed. It is compiled only for
Debug simulator builds. Launch without the environment variable to return to the
normal app. This is a manual visual preview, not a test runner.

## Connected pathways

- Guest welcome and Calgary browsing; authentication returns to a pending posting.
- Email/password sign-up and sign-in, one-time role choice, session restoration,
  and server sign-out. Native credentials are signed bearer sessions in Keychain.
- Single-button illustrated welcome, inline expanding authentication, and staged
  developer setup with protected drafts and optional private-area setup.
- Map-first city ideas browsing, category markers, floating opaque search tray,
  and expandable result/detail sheets. Pins represent postings, never people.
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

`tests/native/server.mjs` is a loopback-only, opt-in test harness. It executes the
production Convex HTTP/auth/data functions in an ephemeral `convex-test` runtime
with scripted AI results and fictional profiles/postings. It never connects to a
cloud database or paid model, and requires neither Convex login nor `.env.local`.
This is test-runtime verification, not evidence that a cloud deployment is live.

1. Run `bun run ios:test:server`. It creates fresh reserved-domain accounts with
   randomly generated credentials kept only in memory. Its context endpoint is
   loopback-only and must never be published.
2. For manual simulator browsing, set `API_BASE_URL = http:/$()/127.0.0.1:5199` in
   ignored `Local.xcconfig`, then rebuild. The physical iPhone cannot reach this
   loopback server. Use a deployed development Convex HTTP site for device testing.
3. Run `bun run ios:test`. Integration tests exercise sessions, map privacy,
   discovery, mutual interest, retry safety, stale edits and claims; UI tests drive
   each role. The UI tests select the fixture URL automatically.

Without that server, integration and role tests explicitly skip; model and launch
tests still run. A skipped integration test is not evidence of backend parity.
Restart the harness with fresh accounts before repeating mutating walkthroughs.

For isolated profile tests when the default port is busy:

```sh
NATIVE_TEST_PORT=5299 bun run ios:test:server
TEST_RUNNER_BUILD_CONNECT_TEST_API=http://127.0.0.1:5299 bun run ios:test -only-testing:BuildConnectUITests/ProfileFlowTests -parallel-testing-enabled NO
```

Profile tests use one-shot delayed and failed responses in the local harness to
check loading layout, retry, and returning to the app during a request.

## Deployment and product gates

The Convex changes must be deployed separately, with approval, before an existing
cloud deployment serves this API. No application Worker is required. Browser
cookies and origin checks remain enabled; native requests send the Convex HTTP
site origin and signed bearer sessions.

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

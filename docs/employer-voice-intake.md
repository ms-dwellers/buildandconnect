# Requester project intake

Open `/hire` from a requester account for record-and-review intake. Use
**Describe a project with voice** on the requester dashboard for the
[`/voice`](voice-studio.md) recorded-turn interviewer and incremental brief.

## Provider setup

Set these server-only values in the selected Convex deployment, for development
or production. They do not belong in the web Worker's environment:

| Setting                | Purpose                                                         |
| ---------------------- | --------------------------------------------------------------- |
| `ELEVENLABS_API_KEY`   | ElevenLabs key with speech-to-text and text-to-speech access    |
| `ELEVENLABS_STT_MODEL` | Optional; defaults to `scribe_v2`                               |
| `ELEVENLABS_VOICE_ID`  | Optional spoken-reply voice for `/voice`                        |
| `ELEVENLABS_AGENT_ID`  | Private live agent for native/older clients, not needed by web  |
| `FIREWORKS_API_KEY`    | Fireworks key for structured text analysis                      |
| `FIREWORKS_MODEL`      | Optional; defaults to `accounts/fireworks/models/glm-5p3-flash` |

No provider keys are sent to the browser. Neither service is provisioned by installing dependencies, and
neither key is needed to build or run the automated tests. Live calls are billable.
Model IDs are non-secret Convex variables with defaults in
`backend/hiring/models.ts`. This integration does not establish sponsor eligibility.

## User flow

1. Record an answer, or type one. Recording requires an explicit action and
   browser microphone permission. The same audio stream drives the visualizer.
2. **Stop and transcribe** sends the recording through `/api/hiring/transcribe`
   to ElevenLabs. **Discard recording**, leaving the page, or hiding the tab
   discards an unfinished recording. Recordings stop after 60 seconds and are
   limited to 2 MB. Transcribed text stays editable before it is sent anywhere else.
3. **Draft the brief** sends the written answer and conversation to Fireworks.
   Fireworks returns a structured draft and one follow-up question. Unknown details
   remain empty instead of being guessed.
4. **Review project brief** opens editable fields for the work, causes,
   communities served, technologies, location, hours, timeline and compensation.
5. After explicit review/consent, **Find up to 10 developers** first asks Fireworks
   for simple matching criteria, then for recommendations from real available,
   discoverable profiles. No fake candidates or fallback model results are used.

Drafts, recordings, criteria and recommendations are not persisted by this flow.
The app does not automatically post opportunities, send invitations or make
hiring decisions. Posting and opportunity-specific interest still use the
existing dashboard flows. A reload discards this intake's state.

The requester-only `POST /api/hiring/posting-draft` accepts `{brief}` after review
and prepares a partial opportunity draft without provider calls or persistence.
It copies fields only when they satisfy the existing posting schema, reports
missing fields, and returns the original `reviewedBrief` plus `unmappedFields`.
Technology preferences never become essential-technology gates. The shared
browser/backend mapper carries location into the editable city field and keeps
work arrangements, technology preferences, and communities in the description.
Budget and timeline become editable posting fields; no coordinates are inferred.
Overlong fields are flagged rather than truncated. The response always requires
confirmation and identifies the missing map pin. The frontend uses the same
mapper to create an account-owned saved project draft; neither preparation path
publishes anything. Only an explicit publishing action does so.

The app holds audio only in memory while transcribing and does not store it in
Convex, R2 or logs. ElevenLabs receives the audio, while Fireworks receives
conversation text and relevant profile data. Each provider's retention policy applies.

## Boundaries

- All `/api/hiring/*` endpoints require the authenticated requester role.
  Normal same-origin checks, no-store responses, and JSON body limits apply.
- `/status` returns provider availability booleans, not secrets.
- `/transcribe` accepts only supported audio MIME types, caps request size,
  disables speaker diarization, and returns only transcript text.
- `/brief` validates the bounded conversation and Fireworks' strict JSON output.
- `/turn` accepts recent messages and the prior brief, then returns the next reply,
  updated brief, and a readiness flag together for the recorded `/voice` flow.
- `/speech` returns a bounded MP3 for an explicit reply; voice selection and
  provider credentials remain server-owned. Speech failure does not undo a turn.
- `/matches` accepts a reviewed brief. It loads up to 200 discoverable profiles
  through existing authorized Convex queries, filters availability and explicit
  volunteer consent, and rejects oversized pools rather than silently selecting
  the first profiles. The additive profile schema needs no data migration or
  new database.
- Profile names, emails, coordinates, authentication data and embeddings are not
  included as candidate fields in Fireworks requests. Free-form profile content
  may contain personal information supplied by the developer.
- Responses may contain at most ten distinct IDs from the supplied pool.
  Discovery and availability are checked again after inference, so a profile
  that opted out during the request is not returned.
- Developer profiles save optional professional experience years, minimum and
  preferred hourly rates (with currency), and a preferred work arrangement that
  can be marked required. The profile editor's **Matching preferences** section
  saves these without an AI call. Existing profiles remain compatible; blank
  values stay unknown rather than being inferred from the 1–5 experience level.
- Fireworks receives the saved preferences. Zero years is valid and never an
  experience-based exclusion, even when the suggested range starts above zero.
  Preferred rates and ordinary work preferences affect ranking, not eligibility.
  A confirmed incompatible required arrangement, or an hourly budget below the
  developer's minimum in the same currency, excludes the candidate. Unknown
  arrangements, different currencies and project budgets need discussion, not
  invented conversions. These boundaries are rechecked after inference.
  Causes and communities refer to project beneficiaries, not protected traits
  of the developer.
- Core Fireworks analysis/embeddings and deterministic opportunity matching
  remain separate. Intake matching is an explicit action, not a
  silent replacement for those routes.
- Timeouts, malformed outputs and provider failures produce retryable errors,
  never invented data. Provider error bodies and keys are not logged or returned.
- This preparation does not add a shared per-account inference quota. Configure
  provider spending limits and add durable request quotas before public rollout.

## Verification

Run `bun run check`, `bun run build`, and `bun run smoke`. Provider and route
tests substitute the external network boundary, not the parsers or role checks.
Browser QA should cover microphone permission, recording/cancellation, editable
transcription, explicit Fireworks submission, review consent, empty candidates,
provider failure, mobile layout, reduced motion, and microphone cleanup.

Live transcription accuracy and Fireworks output quality require configured keys
and separate real-provider testing. Automated fixture success does not establish
that either account is configured or that the selected models are accessible.

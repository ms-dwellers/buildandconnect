# Employer voice intake

Open `/hire` from a company account, or use **Describe a project with voice** on
the company dashboard. `/wip-voice-ai` remains the separate local-only animation
prototype.

## Provider setup

Set these server-only values in an ignored `.env.local` or `.dev.vars` for local
development, or in the Worker's secret store for production:

| Setting                | Purpose                                           |
| ---------------------- | ------------------------------------------------- |
| `ELEVENLABS_API_KEY`   | ElevenLabs key with speech-to-text access         |
| `ELEVENLABS_STT_MODEL` | Optional; defaults to `scribe_v2`                 |
| `OPENROUTER_API_KEY`   | OpenRouter key with access to a Gemini text model |
| `OPENROUTER_MODEL`     | Optional; defaults to `google/gemini-3.8-flash`   |

Restart the server after changing local configuration. No provider keys are sent
to the browser. Neither service is provisioned by installing dependencies, and
neither key is needed to build or run the automated tests. Live calls are billable.
Model IDs are non-secret Worker variables with defaults, not required secrets.
To override those defaults, set the model environment variables when starting
the development server or building the Worker.
Keep config defaults inline: Cloudflare's Vite plugin denies runtime access to
config dependencies. Tests keep them aligned with `backend/hiring/models.ts`.
Verify separately that the submission track accepts Gemini accessed through
OpenRouter; this integration does not establish sponsor eligibility.

## User flow

1. Record an answer, or type one. Recording requires an explicit action and
   browser microphone permission. The same audio stream drives the visualizer.
2. **Stop and transcribe** sends the recording through `/api/hiring/transcribe`
   to ElevenLabs. **Discard recording**, leaving the page, or hiding the tab
   discards an unfinished recording. Recordings stop after 60 seconds and are
   limited to 2 MB. Transcribed text stays editable before it is sent anywhere else.
3. **Send to Gemini** sends the written answer and conversation to OpenRouter.
   Gemini returns a structured draft and one follow-up question. Unknown details
   remain empty instead of being guessed.
4. **Review project brief** opens editable fields for the work, causes,
   communities served, technologies, location, hours, timeline and compensation.
5. After explicit review/consent, **Find up to 10 developers** first asks Gemini
   for simple matching criteria, then for recommendations from real available,
   discoverable profiles. No fake candidates or fallback model results are used.

Drafts, recordings, criteria and recommendations are not persisted by this flow.
The app does not automatically post opportunities, send invitations or make
hiring decisions. Posting and opportunity-specific interest still use the
existing dashboard flows. A reload discards this intake's state.

The company-only `POST /api/hiring/posting-draft` accepts `{brief}` after review
and prepares a partial opportunity draft without provider calls or persistence.
It copies fields only when they satisfy the existing posting schema, reports
missing fields, and returns the original `reviewedBrief` plus `unmappedFields`.
Technology preferences never become essential-technology gates. Free-text
location needs city/pin selection; hybrid/flexible arrangements and structured
budget details are not silently flattened into the older posting format.
Overlong fields are flagged rather than truncated. The response always requires
confirmation and identifies the missing map pin. The frontend still needs to
carry this draft into the posting form; this endpoint does not publish anything.

The app holds audio only in memory while transcribing and does not store it in
Convex, R2 or logs. ElevenLabs receives the audio, while OpenRouter and its model
provider receive conversation text and relevant profile data. Provider retention
policies apply; this is not a claim of provider-side zero retention. OpenRouter
routing requires structured output support and excludes data-collection routes.

## Boundaries

- All `/api/hiring/*` endpoints require the existing authenticated company role.
  Normal same-origin checks, no-store responses, and JSON body limits apply.
- `/status` returns provider availability booleans, not secrets.
- `/transcribe` accepts only supported audio MIME types, caps request size,
  disables speaker diarization, and returns only transcript text.
- `/brief` validates the bounded conversation and Gemini's strict JSON output.
- `/matches` accepts a reviewed brief. It loads up to 200 discoverable profiles
  through existing authorized Convex queries, filters availability and explicit
  volunteer consent, and rejects oversized pools rather than silently selecting
  the first profiles. The additive profile schema needs no data migration or
  new database.
- Profile names, emails, coordinates, authentication data and embeddings are not
  included as candidate fields in Gemini requests. Free-form profile content
  may contain personal information supplied by the developer.
- Responses may contain at most ten distinct IDs from the supplied pool.
  Discovery and availability are checked again after inference, so a profile
  that opted out during the request is not returned.
- Developer profiles save optional professional experience years, minimum and
  preferred hourly rates (with currency), and a preferred work arrangement that
  can be marked required. The profile editor's **Matching preferences** section
  saves these without an AI call. Existing profiles remain compatible; blank
  values stay unknown rather than being inferred from the 1–5 experience level.
- Gemini receives the saved preferences. Zero years is valid and never an
  experience-based exclusion, even when the suggested range starts above zero.
  Preferred rates and ordinary work preferences affect ranking, not eligibility.
  A confirmed incompatible required arrangement, or an hourly budget below the
  developer's minimum in the same currency, excludes the candidate. Unknown
  arrangements, different currencies and project budgets need discussion, not
  invented conversions. These boundaries are rechecked after inference.
  Causes and communities refer to project beneficiaries, not protected traits
  of the developer.
- Existing Workers AI analysis/embeddings and deterministic opportunity matching
  are unchanged. Gemini intake matching is a separate explicit action, not a
  silent replacement for those routes.
- Timeouts, malformed outputs and provider failures produce retryable errors,
  never invented data. Provider error bodies and keys are not logged or returned.
- This preparation does not add a shared per-account inference quota. Configure
  provider spending limits and add durable request quotas before public rollout.

## Verification

Run `bun run check`, `bun run build`, and `bun run smoke`. Provider and route
tests substitute the external network boundary, not the parsers or role checks.
Browser QA should cover microphone permission, recording/cancellation, editable
transcription, explicit Gemini submission, review consent, empty candidates,
provider failure, mobile layout, reduced motion, and microphone cleanup.

Live transcription accuracy and Gemini output quality require configured keys
and separate real-provider testing. Automated fixture success does not establish
that either account is configured or that the selected models are accessible.

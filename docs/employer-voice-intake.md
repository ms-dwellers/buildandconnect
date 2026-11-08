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
  the first profiles. There is no new database or Convex schema migration.
- Profile names, emails, coordinates, authentication data and embeddings are not
  included as candidate fields in Gemini requests. Free-form profile content
  may contain personal information supplied by the developer.
- Responses may contain at most ten distinct IDs from the supplied pool.
  Discovery and availability are checked again after inference, so a profile
  that opted out during the request is not returned.
- Zero professional experience is valid; experience ranges are soft preferences.
  Causes and communities refer to project beneficiaries, not protected traits
  of the developer. Unknown candidate rates, years and remote-work preferences
  stay unknown: existing developer profiles do not yet capture those fields.
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

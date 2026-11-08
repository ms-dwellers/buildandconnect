# Voice studio

Open `/voice` with a requester account for a spoken project conversation.
The voice agent and background form-filling agent have separate responsibilities.
The former `/wip-voice-ai` URL redirects permanently to `/voice`.

## Two agents

- **ElevenLabs interviews.** Its private conversational agent handles live audio,
  transcription, turn detection, questions, and spoken replies.
  The central text begins with “Hey — ready whenever you are.” and then shows the
  agent’s current words. It does not fill fields or invoke application tools.
  Replies roll in word by word with a short upward fade; reduced-motion users
  receive the text immediately. The full sentence is one screen-reader update.
- **Fireworks extracts.** Final transcript events go to `/api/hiring/extract` through
  the existing authenticated API. Fireworks reads recent conversation and the prior
  brief, then returns only structured fields. It never supplies the spoken reply.
  Only user statements establish requirements; agent questions are not evidence.

Updates are debounced and serialized, so slow extraction does not interrupt the
interview and newer conversation is picked up after an in-flight update. Existing
fields remain visible if extraction fails; **Retry brief update** retries it.
Recent transcript context is bounded to 24 messages and the API’s body limit.
Earlier extracted facts are retained in the previous brief.

## User flow

1. **Begin conversation** requests microphone permission and connects to ElevenLabs.
   The agent waits for the user to speak. Only a short-lived signed connection URL
   reaches the browser; the API key stays on the server.
2. Talk normally or type an answer below the panel. Text can start a text-only
   session when microphone access is unavailable. The background brief updates
   independently while the interview continues.
3. **Pause conversation**, **End conversation**, hiding the page, or navigation
   disconnects the voice session and releases the microphone. Resume establishes
   a fresh connection with recent transcript context. Muting spoken replies
   changes playback volume without stopping transcription.
   During spoken replies, the microphone is muted so incidental speech does not
   interrupt or enter the brief. **Interrupt** appears only while the AI is
   speaking; it stops the reply and reconnects with the conversation and brief
   preserved. There may be a short connection delay before listening resumes.
   The SDK does not expose a stop-current-reply operation, so no fake user
   utterance is sent to force an interruption.
4. **Review project brief** ends the interview, saves the extracted project fields
   as a private draft, and opens the single editable review/publishing form.
   Nothing is published and no invitations are sent automatically.

**Fill out manually** skips the interview and opens the editable form immediately,
even with an empty brief. You can also switch to manual entry during a conversation.
Existing extracted fields are kept; pending AI updates are canceled so they cannot
overwrite manual edits. Editing does not require microphone access or configured
voice services. The saved review form requires an authenticated, configured
Convex backend, but no voice or inference service until explicit publishing.

The saved form is prefilled using the latest extracted brief. Title, description, location, pay, hours, causes,
and timeline carry over. Technology preferences and communities served are kept
in the description; preferences never become mandatory technology filters.
You can edit everything before explicitly posting. Drafts are scoped to the
signed-in requester, use only a random ID in the URL, and survive reloads.
The dashboard lists unfinished drafts. The legacy `/hire` matching flow keeps
its explicit Fireworks consent and now hands its results into the same saved form.

Navigation remains above the full-screen voice panel. There is no preview label,
timer, atmosphere control, waveform, voice-style bar, or separate microphone row.
The transcript and project brief sit below the first viewport. Reduced-motion
preferences stop the aurora; WebGL has a CSS fallback.

Before review, conversation and extracted fields stay in page memory; reload
or clear discards them. Reviewing saves only project fields to Convex. Recordings
and transcripts are never saved with the project draft. ElevenLabs
receives live audio and conversation; Fireworks receives transcript and
brief data. Provider retention policies apply. The supplied agent configuration
disables audio recording and limits transcript retention to one day.

## Configuration

The existing `ELEVENLABS_API_KEY` needs Agents read/write access for setup and
conversation authorization. `ELEVENLABS_AGENT_ID` identifies the private agent.
With the key in ignored `.env.local`, run `bun run setup:voice` once to create the
agent using `backend/hiring/interview-agent.ts`. The script refuses to replace
an existing configured agent and writes the ID only to the ignored, private local
environment file. Agent creation is a remote configuration change; it does not
deploy the application. Restart local development after changing configuration.

`/api/hiring/voice-session` authorizes only requester accounts and returns an uncached
signed WebSocket URL. Browser audio then goes directly to ElevenLabs. The existing
`/hire` recorder and explicit transcription workflow are unchanged. The new agent
has no application tools, uses a 15-minute session limit, allows two concurrent
sessions and 100 starts per day, and disables burst billing. Live calls are billable.
These agent limits do not replace a per-account application quota before rollout.

## Verification

Run `bun run check`, `bun run build`, and `bun run smoke`. Check microphone access,
live transcription and replies, central agent text, independent background field
updates/corrections, permission and provider failures, stale update cancellation,
review/consent, and media cleanup. Check mobile widths, keyboard access, reduced
motion, and WebGL fallback. Fixture success does not prove live provider access.

# Voice studio

Open `/voice` as a requester to turn recorded answers into a project brief.
The old `/wip-voice-ai` URL redirects to `/voice`.

## Recorded turns

1. **Record your project** asks for microphone permission and starts a local
   recording. The microphone is never opened automatically for a new turn.
2. **Stop recording** releases the microphone and keeps the audio in memory.
   Listen to the preview, **Record again**, or **Discard recording**. Nothing
   is uploaded until **Send recording**. Each answer is limited to 60 seconds
   and 2 MB; reaching the time limit stops locally, without sending.
3. **Send recording** uploads the audio through the same-origin
   `/api/hiring/transcribe` endpoint. ElevenLabs Scribe returns text. The UI
   then sends that text, recent conversation, and the prior brief to
   `/api/hiring/turn` for Fireworks to return one follow-up question and an
   updated structured brief in the same response. There is no parallel
   extraction request, voice WebSocket, live transcription, or turn detector.
4. The reply appears over the aurora and in the conversation. When spoken
   replies are enabled, `/api/hiring/speech` generates an ElevenLabs MP3.
   **Stop reply** stops it; **Play reply** replays the cached audio or retries
   generation if it failed. Browser autoplay restrictions leave the text
   usable and offer explicit playback. Recording another answer stops playback
   before requesting the microphone.
5. Record and send the next answer, or use **Or type an answer**. Only one
   transcription/brief turn runs at a time. Each successful turn commits both
   user/assistant text and the brief locally. The model asks one useful question
   at a time and accepts details that are unknown or deferred. Once enough is
   known, the primary action becomes **Review project brief**. The requester
   can still add another answer or review the brief sooner.
6. Review saves only project fields as an account-owned private draft and opens
   the existing editable publishing form. Nothing is published or assigned
   automatically. **Fill out manually** skips voice and inference entirely.

## Recovery and privacy

- Upload failure keeps the recording for another explicit send. Brief-generation
  failure keeps the transcription in the editable answer field and leaves the
  previous brief unchanged. Oversized transcripts must be edited, not silently
  truncated. Unsent typed notes are preserved alongside a transcribed recording.
- **Cancel processing** aborts the current turn without starting another one.
  It preserves an untranscribed recording or the transcription already obtained.
  Reset, manual review, and unmount invalidate late responses and stop media.
- Hiding the page discards an unfinished capture and stops reply/preview
  playback. Completed recordings and in-progress submitted turns can remain in
  page memory, but the microphone is off. Returning never starts recording.
- Recent context is bounded to 24 messages and 28,000 UTF-8 bytes with the prior
  brief. Earlier facts stay in the prior brief. A context that cannot fit fails
  explicitly and offers manual review rather than dropping known fields.
- Recordings, transcripts, and generated reply audio are not stored in Convex,
  R2, browser storage, or application logs. They stay in page memory until
  replaced, cleared, sent/transcribed, or navigated away from. Reviewing saves
  project details only. Reloading before review discards the conversation.
- ElevenLabs receives submitted audio for transcription and reply text for
  speech. Fireworks receives transcript and brief context. Provider retention
  policies apply; the original live-agent retention settings do not govern
  these REST requests. Calls are billable. Configure provider spending limits
  and durable per-account quotas before public rollout.

## Server contract and setup

All hiring endpoints require a live requester session and retain the existing
origin checks. Browser requests stay on `/api`; provider keys remain in Convex.

| Endpoint                      | Input                                                        | Output                               |
| ----------------------------- | ------------------------------------------------------------ | ------------------------------------ |
| `POST /api/hiring/transcribe` | Supported audio body, at most 2 MB                           | `{text}`                             |
| `POST /api/hiring/turn`       | `{messages,brief}`; latest message must be the user's answer | `{reply,brief,readyForReview}`       |
| `POST /api/hiring/speech`     | `{text}`; 1-1000 characters                                  | `audio/mpeg`, at most 2 MB, no-store |

The forwarder retains the 32 KB limit for JSON and all other endpoints. Only
the exact transcription POST gets the larger audio allowance, including streamed
bodies without a trusted Content-Length. Provider calls have explicit timeouts
and receive cancellation signals. Audio and object URLs are released when no
longer needed. Reduced-motion preferences disable aurora/text motion; WebGL has
a CSS fallback.

Configure `ELEVENLABS_API_KEY` with speech-to-text and text-to-speech access and
`FIREWORKS_API_KEY` in the selected Convex deployment. Optional
`ELEVENLABS_STT_MODEL` defaults to `scribe_v2`; optional `ELEVENLABS_VOICE_ID`
selects the reply voice. Without an override, replies use the original
interviewer's default voice and `eleven_flash_v2_5`. No new agent or credential
is needed. Sync the changed Convex HTTP actions and update the web host together.

`ELEVENLABS_AGENT_ID`, `/hiring/voice-session`, `/hiring/native-voice-session`,
and `/hiring/extract` remain for native or older clients; the web studio no
longer calls them. The legacy `/hire` flow still transcribes on stop and lets
the requester edit before its explicit **Draft the brief** action. Both web
flows share the same bounded local recorder and audio forwarding path.

## Verification boundaries

Formatting, type checks, production builds, and synthetic UI previews do not
establish microphone compatibility or live provider behavior. With explicit
testing authorization, cover permission denial, local stop/preview/send,
successive turns, cancellation/stale replies, short/empty/oversized recordings,
upload and model failures, unavailable playback/autoplay, completion, manual
review, mobile layouts, reduced motion, and media cleanup. Real transcription
accuracy and provider access require separately authorized live calls.

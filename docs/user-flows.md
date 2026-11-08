# Product decisions and user flows

Build & Connect helps early-career developers practice requirements from a job
they want through useful community projects. Requesters get help with real
problems; developers build experience and working relationships.

## Decisions for the first release

- Developer and Requester remain the only account roles. “Project” is the umbrella
  term. A community request allows exclusive pickup; an opportunity uses mutual
  interest. These are existing, deliberately separate commitments.
- Start from a pasted job description, with an optional HTTP(S) source URL. The
  URL is attribution, not an instruction to crawl a website. Broad career goals
  can be explored later; do not invent job requirements to represent them.
- Source quotes explain requirements. Profile skills remain self-reported.
  Project activities offer practice, not proof of mastery or qualifications.
- Targets are private and saved to the developer's account. Saving a replacement
  requires the version the developer reviewed; failures preserve the old target.
- Requests and opportunities keep their current authorization and eligibility
  rules. Viewing recommendations never claims a project, sends interest, or makes
  the developer publicly discoverable.
- “Connected” means both parties expressed interest, not that work was delivered.
  A claimed request appears on both dashboards. Contact, messaging, notifications,
  submissions, and confirmed outcomes are not implied by either state.
- Plan for a three-minute judging demo. Prioritize a working requirement →
  relevant project → concrete activity interaction; adapt timing if the event's
  actual limit differs. Completion evidence remains future work.

## Developer journey

1. Sign in or create an account directly from the homepage. Confirm Developer,
   then complete four small profile steps with skills, experience, availability,
   and optional interests. Choose visibility and volunteer consent explicitly;
   add project evidence, detailed preferences, and a search area later. Existing
   profiles skip these steps.
2. Open **Find projects** from navigation or **Find projects for my goals** from
   the dashboard.
3. Paste a target job description. Review the privacy/AI disclosure and save.
4. Inspect requirements alongside verbatim supporting quotes. See what is already
   in the profile and what could be practiced. Credentials and employment tenure
   are not treated as project-achievable skills.
5. Select a requirement. The list and Calgary map show related projects together.
   Projects outside the map's supported area or without a visible pin remain in
   the list. No location is invented and the existing map privacy policy applies.
6. Inspect the project description, relevant activities, existing strengths, and
   opportunities to practice. Legacy projects without extracted activities say
   so rather than inventing work.
7. Review the project details before any commitment. Local requests open at
   `/requests/:id`, with scope, estimated difficulty, support, eligibility, and
   explicit acceptance confirmation. Opportunities use explicit interest, not
   acceptance. Neither action runs automatically from a recommendation.
8. Return later to the saved target, or edit it. Source changes re-run analysis;
   a failed analysis or concurrent edit does not silently replace it.

## Requester journey

1. Choose **Start a project** at `/projects/new`, then talk or write.
2. Voice uses `/voice`; **Review project brief** ends the conversation, cancels
   extraction, and saves the extracted project fields privately. Manual entry
   creates the same kind of private draft without any microphone or AI request.
3. Review and edit once at `/projects/drafts/:id`. Changes save automatically to
   Convex; **Save and exit** waits for saving before returning to the dashboard.
4. Resume saved drafts from the dashboard, including on another device. The UI
   warns about unsaved changes and rejects stale saves rather than overwriting
   another tab. Failed saving leaves the current fields intact for retry.
5. **Publish opportunity** validates the saved draft and explicitly runs posting
   analysis. Saving is never publishing. Failed analysis leaves the draft intact;
   retries and simultaneous publication cannot create duplicate opportunities.
6. Manage published opportunities, responses, and mutual interest from the
   dashboard. A mutual connection is not a work assignment or delivery record.

The shorter community-request form and its exclusive pickup remain available.
Unifying these two posting journeys is a later product change, not part of the
release. The existing `/hire` Gemini suggestion flow is retained and also hands
its reviewed brief into a saved project draft. `/opportunities/new` redirects to
the shared starting point. Drafts contain project fields, not recordings or
transcripts; see [project drafts](project-drafts.md) for the persistence contract.

## Scope after this release

Account entry now preserves destinations and uses shorter developer setup;
dashboards prioritize drafts, responses, and accepted work. See
[account entry and dashboard flow](experience-flow.md).

Decide how both parties coordinate after connection. Delivery submissions,
owner confirmation, and portfolio evidence need their own full lifecycle. Do not
equate the existing close action with successful completion.

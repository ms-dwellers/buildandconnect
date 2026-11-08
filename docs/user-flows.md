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

1. Create an account and a developer profile with skills, experience, interests,
   availability, and an optional nearby search area.
2. Open **Career path** from navigation or the dashboard.
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
7. Review the project through its existing detail/map flow before any commitment.
   There is no new automatic pickup or interest action on the career screen.
8. Return later to the saved target, or edit it. Source changes re-run analysis;
   a failed analysis or concurrent edit does not silently replace it.

## Requester journey retained

1. Describe a project at `/voice`, either by live conversation or manual entry.
2. Review the brief. Switching from voice cancels pending extraction updates.
3. Request developer suggestions deliberately, then open the prefilled posting.
4. Review all details and explicitly publish. A brief is never a public posting.
5. Manage the published opportunity and mutual interest from the dashboard.

The shorter community-request form and its exclusive pickup remain available.
Unifying these two posting journeys is a later product change, not part of the
career-target release. The shared brief mapper serves both the existing browser
handoff and the backend posting-draft endpoint.

## Scope after this release

Further simplify onboarding and requester entry, add resumable project drafts,
and decide how both parties coordinate after connection. Delivery submissions,
owner confirmation, and portfolio evidence need their own full lifecycle. Do not
equate the existing close action with successful completion.

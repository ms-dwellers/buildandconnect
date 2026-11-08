# Build & Connect: user flow and judging plan

Build & Connect helps early-career developers move toward the jobs they want by
solving useful problems for their community. Career growth is the product;
community projects are how it happens.

This brief summarizes the product decisions from planning, not a raw chat
transcript. The presentation sequence below is proposed, not a claim that every
screen or workflow is implemented.

## Current integration decisions

See [user flows](user-flows.md) for the release decisions and implemented journeys.
The career backend is integrated with the current two-role app; the `/career`
screen connects private saved targets to source-backed requirements and related
project activities on the Calgary map and list. Live requester voice conversation
at `/voice`, manual entry, explicit interruption, and the existing prefilled
opportunity handoff are retained.

Project commitment review and resumable requester drafts are also implemented:
`/projects/new` leads to voice or manual entry, then one saved review/publishing
form. Community requests have explicit acceptance review; opportunities retain
mutual interest. Delivery confirmation and messaging are still not implemented.

Start with a specific job description, not an inferred broad career goal. Keep
exclusive community-request pickup and opportunity mutual interest separate.
Three minutes is the planning budget, subject to confirmation by the event.
The historical branch snapshot below is retained for provenance; its role and
implementation-status descriptions do not supersede these current decisions.

## The hackathon prompt

> Leverage tech to build in-demand skills and to build meaningful job connections
> in a changing job market.

The app addresses both halves through the same activity:

- **Build relevant skills:** use a specific target job to identify opportunities
  to practice skills the developer has not yet demonstrated.
- **Build meaningful connections:** work with a real organization on an outcome
  it needs, rather than relying on profile polish or generic networking.

One job description establishes what that employer asks for. It does not prove
market-wide demand, and the app must not present it that way.

## The core promise

> Job boards show you the experience you need. We show you where to get it.

The central interaction is:

**Target job requirement → relevant community project → concrete project activity.**

A developer can select a requirement and understand which project offers a
chance to practice it. The map makes those opportunities tangible and local.
This should be a useful decision-making interaction, not an ornamental skill
graph or an arbitrary career-readiness percentage.

After delivery, the intended longer-term loop becomes:

**Project activity → delivered artifact → organization-confirmed outcome.**

That evidence and the working relationship are the career value. Submission and
completion evidence are not implemented yet.

## Developer flow

1. **Describe existing experience.** Add skills, previous projects, learning
   interests, available time, and a search area. Existing profile work and skill
   levels are self-reported, not independently verified.
2. **Choose a destination.** Paste a job description the developer wants to work
   toward, optionally with its source URL. The app extracts requirements and
   retains supporting quotes from the original text.
3. **Understand the gap.** Show relevant self-reported skills separately from
   requirements lacking evidence. Degrees, years of employment, and similar
   requirements must not be treated as satisfied by completing one project.
4. **Explore relevant projects.** Highlight suitable projects on the map. Keep
   requirements, project activities, and their skill links inspectable. Explain
   what the developer brings and what they could practice.
5. **Review before committing.** Show the problem, expected work, difficulty,
   practical constraints, and any explicitly offered support. Difficulty is an
   estimate, not a guarantee that the developer can deliver independently.
6. **Pick up an eligible project.** Reuse the exclusive community-request claim
   flow. The backend rechecks availability and eligibility when claiming; a
   recommendation alone does not reserve the project or bypass consent rules.
7. **Deliver and build a track record.** The intended future flow lets the
   developer submit work and the organization confirm the outcome. It should
   preserve who delivered the work, evidence links, and specific feedback.

Career targets and personal recommendations are private. A developer can explore
without recruiter discoverability, but existing claim and interest actions still
have their own discovery-consent restrictions.

## Project-poster flow

1. **Describe a real problem in ordinary language.** Posters should not need to
   know which technical stack to request. They can type, or use the existing
   employer voice intake where their account role permits it.
2. **Clarify and review.** The employer intake asks follow-up questions and
   produces an editable brief. Unknown details remain unknown. Technical
   preferences must not silently become mandatory hiring requirements.
3. **Prepare a posting.** Map reviewed brief fields into the existing posting
   format. Ask for missing information and a map pin where needed. Preserve
   details the older posting format cannot represent for explicit confirmation.
4. **Publish deliberately.** Creating a brief or requesting developer suggestions
   is not publication. The owner must confirm and use the existing posting flow.
5. **See who picked it up.** A requester can see the claimant on their community
   request. Do not describe this as a live notification system; current reads
   require loading or refreshing the relevant resource.
6. **Confirm the delivered outcome.** This is the proposed completion flow, not
   the existing close action. Closing a request currently clears its claimant
   and does not create a portfolio record.

There are currently two posting behaviors: community requests support exclusive
pickup; company opportunities support mutual interest. A unified pickup flow is
product direction to resolve later, not something this backend change delivers.

## Example story

Use one coherent scenario throughout the demonstration. The following is an
illustrative project, not a claim that a real food bank has posted it.

- **Organization problem:** a food bank needs volunteers to reserve shifts
  without staff coordinating every booking by phone.
- **Developer starting point:** basic React experience and an interest in
  becoming a full-stack developer.
- **Target job:** a sourced junior full-stack posting that actually requests the
  skills used in the demonstration.
- **Useful project:** a small volunteer scheduling tool with clear, achievable
  scope.

| Target requirement  | Relevant project activity          | What the developer can practice |
| ------------------- | ---------------------------------- | ------------------------------- |
| Database experience | Store shifts and reservations      | Data modeling and persistence   |
| Authentication      | Let staff sign in                  | Authentication                  |
| Permissions         | Restrict schedule editing to staff | Authorization                   |

Use only requirements supported by the selected job description and activities
supported by the selected project. Do not invent mentorship, deadlines, budgets,
or acceptance criteria just to make the match look stronger.

## Historical backend-branch snapshot

This snapshot reflects the backend feature branch through commit `6468bb59`.
It is not a statement that those changes are merged into `main` or deployed.

| Capability                                                  | Status and presentation boundary                                                                      |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Accounts, profiles, map listings, growth matching           | Existing application foundation                                                                       |
| Exclusive community-request claims                          | Existing; company opportunities still use mutual interest                                             |
| Employer voice intake at `/hire`                            | Existing ElevenLabs speech-to-text and Gemini-through-OpenRouter flow; not a live two-way voice agent |
| Reviewed intake brief                                       | Existing editable draft; conversation and brief are not persisted by that flow                        |
| Private target-job extraction and storage                   | Implemented in the backend feature branch                                                             |
| Career-aware recommendations and requirement/activity links | Implemented in the backend feature branch; map highlighting UI still needs wiring                     |
| Reviewed brief to posting draft                             | Backend endpoint implemented; frontend still needs to carry the draft into the posting form           |
| Milestones and accepted delivery evidence                   | Planned, not implemented                                                                              |
| Automatic claimant notifications                            | Not implemented                                                                                       |
| Payments and messaging                                      | Deferred; not part of the agreed implementation                                                       |

The schema remains additive: retain existing user/profile and posting models,
add one `careerTargets` table, and add optional `activities` to project analysis.
Skill gaps and recommendations are computed rather than stored in separate
tables. Existing postings without activities retain skill-level relevance
without fabricated activity links.

The three core feature areas are:

- `GET` and `PUT /api/developers/me/career-target`.
- `GET /api/developers/me/career-projects?limit=20`.
- `POST /api/hiring/posting-draft` for a company-reviewed brief.

See [the backend contract](backend.md#career-targets) and
[employer intake boundaries](employer-voice-intake.md) for details.

## Proposed three-minute judging presentation

The career map interaction is the centerpiece. Keep account creation, setup,
and long forms out of the presentation by preparing separate developer and
poster accounts in advance.

| Time      | What to show                                                                             | What to say                                                                                                                         |
| --------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 0:00-0:15 | The developer's career destination                                                       | "Early-career developers are told they need experience. Community organizations have real problems they need help solving."         |
| 0:15-0:40 | A short employer voice answer becoming editable text and a reviewed brief                | "An organization describes its problem without needing to know the technical stack."                                                |
| 0:40-1:05 | The target job and its source-backed requirements                                        | "Instead of suggesting random projects, we start with the job this developer wants."                                                |
| 1:05-1:50 | Select one requirement, highlight relevant map projects, then reveal a concrete activity | "This project offers a practical next step toward that requirement. Here is the work that creates the learning opportunity."        |
| 1:50-2:10 | Claim an eligible community request and read it from the poster's account                | "This creates a real working relationship, not just another connection request."                                                    |
| 2:10-2:40 | A clearly labeled future completion example or storyboard                                | "The next step is to preserve delivered work and organization feedback as evidence. This completion workflow is planned, not live." |
| 2:40-3:00 | Return to the requirement-to-project connection                                          | "Build relevant skills through useful work, and meaningful connections with the people you helped."                                 |

Do not imply that the voice intake already publishes the claimable request.
Until that handoff is implemented, demonstrate it as a separate intake capability
and use an existing requester-created project for the pickup segment.

If the career UI is not connected yet, show the actual backend response as a
backend preview or label a storyboard as planned. Do not present a mockup as a
working end-to-end feature. The demo should become live only after the required
frontend and backend integration is complete.

## Why this is more than an AI gimmick

- **The recommendation changes a real decision.** It helps a developer choose
  which useful project to take on next.
- **The explanation is inspectable.** Show the source requirement, matching
  skills, and project activity rather than an unexplained score.
- **Both sides benefit.** The organization gets useful work; the developer gets
  practice, a relationship, and eventually evidence of delivery.
- **The limitations are visible.** Practice is not mastery, a completed project
  is not a guaranteed job, and an organization confirming delivery is not an
  independent technical certification.
- **The map has a purpose.** It makes nearby community needs discoverable and
  supports local relationships. Proximity is not presented as the only reason a
  software project is a good fit.

## Demo readiness checklist

- Agree on the actual presentation time and shorten this proposed sequence if
  needed.
- Integrate the selected backend branch deliberately. The separate Convex-only
  refactor and the Hono-based hiring/career endpoints need coordination; do not
  overwrite either agent's work.
- Connect and verify the career-target, requirement-selection, and map-highlighting
  screens before calling the career flow live.
- Use a test development deployment and separate accounts/browser sessions for
  the developer and poster. Existing roles are not freely switchable.
- Use a real, attributed job description and clearly label fictional community
  projects or prepared examples.
- Prepare an eligible open community request with a valid map pin and a developer
  profile whose availability, radius, and consent allow claiming it.
- Check the selected provider accounts and model access before the presentation.
  Live AI calls are billable; automated tests do not establish provider readiness.
- Keep provider keys, account credentials, and credential-bearing URLs out of
  slides, screenshots, console output, and recorded demonstrations.
- If transcription fails, use typed input. If inference fails, show the error or
  a clearly labeled prepared example; never silently substitute a fake live result.
- Rehearse the pickup and poster read-back. Do not claim automatic updates if a
  refresh is required.
- Label the completion example as future work unless submissions and confirmation
  have actually been implemented and verified.
- Verify any sponsor-track requirements separately. Gemini through OpenRouter
  does not by itself establish sponsor eligibility.

The backend feature branch passed formatting/type checks, 114 automated tests,
and production build/smoke checks, with two expected test skips. External model
outputs were scripted in tests; no live provider-quality claim follows from
those results.

## Original implementation priorities (historical)

1. Connect the developer's target-job input to the existing career-target API.
2. Build the requirement-to-project map interaction using the returned links.
3. Carry the reviewed employer brief into the existing posting form, surfacing
   missing and unmapped details for confirmation.
4. Decide whether company projects should use the same pickup flow as community
   requests before changing their lifecycle.
5. Add delivery submissions and owner-confirmed outcomes only when taking on the
   full evidence loop; do not treat the current close action as completion.

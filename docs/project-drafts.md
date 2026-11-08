# Saved project drafts and commitment review

`/projects/new` is the shared requester entry. Manual entry creates an empty
private draft. Voice review and legacy `/hire` suggestions map extracted fields
into the same editable form at `/projects/drafts/:id`.

## Draft persistence

- Convex `projectDrafts` owns the ID, requester, field content, revision, and
  optional published-opportunity ID. No additional database or browser storage.
- Only the owner can list, read, save, discard, or publish a draft. Unrelated
  requesters receive 404, developers cannot access this resource, and the
  server-only bridge secret is still required.
- At most 20 unpublished drafts per requester. Incomplete fields are valid
  drafts; publication applies the existing full opportunity schema.
- The form batches changes after 700 ms and serializes saves. Successful saves
  show **Saved privately**. Network failure leaves edits visible; stale revisions
  stop autosaving and offer an explicit reload confirmation.
- **Save and exit** waits for the latest save. Closing a page with unsaved edits
  triggers the browser's native warning. Closing before a successful save can
  still lose those unsaved edits; the last acknowledged version remains saved.
- Saved content includes the editable project fields and optional pin. It does
  not include recordings, transcripts, model credentials, or developer matches.

## HTTP contract

All routes are authenticated and same-origin:

| Route                                  | Behavior                                                                  |
| -------------------------------------- | ------------------------------------------------------------------------- |
| `GET /api/project-drafts`              | Owner's unpublished drafts, newest first                                  |
| `POST /api/project-drafts`             | `{id, content}` creates a private draft; ID is a UUID                     |
| `GET /api/project-drafts/:id`          | Read the owner's draft and revision                                       |
| `PUT /api/project-drafts/:id`          | `{content, expectedUpdatedAt}` saves if the revision still matches        |
| `DELETE /api/project-drafts/:id`       | `{expectedUpdatedAt}` discards an unpublished draft                       |
| `POST /api/project-drafts/:id/publish` | `{expectedUpdatedAt}` explicitly analyzes and publishes the saved content |

Publication rechecks ownership and revision inside the atomic opportunity
creation mutation. A draft is linked to exactly one opportunity. Repeated or
simultaneous publication returns that opportunity rather than inserting another.
Analysis failure or a concurrent edit publishes nothing. Published drafts are
readable to their owner for retry recovery but no longer appear in the draft list.

## Commitment review

Community requests now have a detail page with expected work, estimated
difficulty, support, and practical unknowns. `/api/requests/:id/match` returns
the developer's current eligibility reasons. Acceptance uses the existing atomic
claim and is explicitly confirmed; changed availability is reloaded after an
attempt. The claimant and requester can both see the acceptance outcome.

Opportunity interest is also confirmed and remains revocable. Scoped interest
reads avoid losing the current response behind unrelated paginated interests.
Both parties see whether a response is pending or mutual. A mutual connection
unlocks project-specific chat; it does not assign work or confirm delivery.
Withdrawing interest pauses new messages without deleting the conversation.

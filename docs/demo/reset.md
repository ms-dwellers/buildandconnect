# Demo reset

Press **↑ ↑ ↓ ↓**, with no more than one second between consecutive keys, on
any website page. Each arrow must be a separate press; holding a key does not
count. Modifier-key combinations do not count. Ordinary navigation stays intact
until the complete sequence is detected.

When enabled, the shortcut immediately restores the captured demo baseline,
invalidates **every production login session**, and returns the triggering browser
to `/`. Other open website tabs detect the reset within five seconds or when
they regain focus, clear remembered sign-in state, and return to `/`.

**This reset is deliberately available to guests. The key sequence is not a
security boundary.** Do not enable it on a service that cannot tolerate public
demo-data resets and global sign-outs.

## Scope

- Restore the captured 50 demo members, 25 developer profiles, 50 opportunities,
  and 25 local requests, including their server-generated analysis and embeddings.
- Remove extra postings, private drafts, career targets, interests, reviews,
  conversations, and messages associated with the captured demo accounts.
- Release non-demo local requests claimed by a demo developer rather than
  deleting those requests.
- Preserve non-demo accounts and unrelated data. Demo account passwords and
  linked authentication providers are not changed. Deleted authentication
  accounts require operator repair before a reset can complete.

Restoration and session invalidation happen in one Convex transaction. A failed
reset does not leave half-restored data. Concurrent requests for the same reset
generation reuse the result rather than resetting twice. The server never accepts
a snapshot, user IDs, trusted analysis, or table names from a browser.

## Enable

1. Deploy the backend containing `demoReset` and `demoSnapshots`.
2. Finish and verify the seed before capturing a baseline. Obtain the 50 demo
   authentication user IDs from the private seed state, not from guessed emails.
3. Run the internal `demoReset:capture` mutation with `{ "userIds": [...] }` on the
   intended deployment. It checks the reserved email domain, demo display names,
   25/25 role split, developer profiles, and two opportunities plus one request
   per requester. It refuses to replace an existing baseline.
4. Set the Convex environment variable `PUBLIC_DEMO_RESET=true` and deploy the
   website with the site-wide shortcut component.
5. Check `/api/demo/reset-status`. It returns only `enabled` and `generation`.

Leave `PUBLIC_DEMO_RESET` unset or set it to `false` to disable reset execution.
The baseline and all account data remain in Convex. Initialization is an
operator-only internal mutation; it is never exposed through the website.

`POST /api/demo/reset` accepts `{ "expectedGeneration": number }` and requires a
trusted `Origin`, including for guests. Only the deployment flag and captured
baseline enable execution. No password, API key, or baseline contents are sent
to the browser.

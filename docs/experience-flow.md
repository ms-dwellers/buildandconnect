# Account entry and dashboard flow

## Start with the account

`/` now opens sign-in directly, with the same illustrated account shell used by
`/sign-in`, `/sign-up`, role selection and developer setup. The map remains
available from navigation without an account. Password visibility is an explicit
toggle; credentials are submitted by POST and never persisted in browser storage.

Selecting a role does not save it. The person reviews Developer or Requester and
uses **Continue as…** to confirm the permanent account type. Requesters then use
the existing voice/manual project entry rather than a developer questionnaire.

## Keep the original destination

Protected pages carry their local path, query, and fragment through `next` when
redirecting to sign-in. Switching between sign-in and signup retains it. New
accounts choose a role explicitly; developer setup retains the same destination.
Existing developers pass through the profile gate, which skips the form when a
profile already exists. When there is no destination, new
developers start setup for `/career` and requesters start at `/projects/new`.

`safeNext` rejects external URLs, backslashes, control characters, oversized
values, the account-first homepage, and authentication/setup loops. This is navigation assistance, not an
authorization boundary: the destination's role gate and Convex ownership checks
still apply. A person choosing an incompatible account type sees the existing
role restriction rather than receiving new permissions.

Failures during signup, sign-in, role selection, profile creation, or area saving
keep the current fields available for retry. If authentication succeeds but the
account read fails, retry the account read instead of creating a second account.
Failed sign-out does not pretend that the session ended. Late account reads are
ignored after a newer refresh or successful sign-out.

## Short developer setup

`/onboarding` is a four-step form: skills, a short bio and self-reported experience
level, city and weekly availability, then optional learning goals and causes with
explicit visibility and volunteer choices. Skill and time shortcuts remain fully
editable. Each step validates before advancing; Back preserves entries, and the
current step receives keyboard focus. Nothing is saved until **Save and continue**.
A full page reload starts the unsaved form again; no profile draft is stored locally.
Projects,
detailed preferences, and the search-area map remain available in `/profile`;
they are not prerequisites to seeing the initial career flow.

Discovery visibility and unpaid-project consent start off and require explicit
opt-in. Availability starts on and collaboration starts flexible, as disclosed by
the form. This uses the existing profile API and does not infer professional
years, completed work, pay preferences, or credentials.

Already-configured developers skip setup and return to their intended destination
or dashboard. Profile-read errors offer a retry rather than an empty form that
could overwrite an existing profile. Project eligibility screens carry a
return destination into profile/area editing, and the corresponding save action
returns to the project. The map remains available before setup is complete.

## Prioritize returning users

- The developer dashboard leads with **Find projects for my goals**, linking to
  the existing career-target flow. Navigation calls this destination **Find
  projects**. The dashboard shows responses and accepted requests before general
  project discovery, with career target and profile status in a quieter sidebar.
- Requesters land on **My projects**, with **Start a project** as the main action.
  Responses come first, followed by private drafts and published projects. Empty
  accounts see the describe/review/connect path instead of empty lists.
- Incoming interest is first, mutual connections next, and sent interest last.
- Open opportunities precede closed ones; claimed requests precede open and
  closed requests. Ordering applies to loaded pages and never mutates source data.
- Empty response, accepted-work, draft, and published-project sections are hidden.
  Profile and availability changes stay in the profile editor. Local community
  requests use a secondary disclosure; a requester's existing requests expand it
  initially. A list refresh failure remains visible even with old rows.
- Project cards use concrete descriptions rather than leading with match
  percentages. Published-project management actions stay under **Project
  options**; closing a project still requires explicit confirmation.
- Interest withdrawn by both sides is labeled **Interest withdrawn**, never
  **Waiting for a reply**. Mutual interest is not a delivery or work assignment.

No notifications, messages, new matching rules, or automatic commitments are
introduced by this flow. Pagination remains explicit through **Load more**.

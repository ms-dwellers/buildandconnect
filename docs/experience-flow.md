# Account entry and dashboard flow

## Keep the original destination

Protected pages carry their local path, query, and fragment through `next` when
redirecting to sign-in. Switching between sign-in and signup retains it. New
accounts choose a role explicitly; developer setup retains the same destination.
Existing members return directly to it. When there is no destination, new
developers start setup for `/career` and requesters start at `/projects/new`.

`safeNext` rejects external URLs, backslashes, control characters, oversized
values, and authentication/setup loops. This is navigation assistance, not an
authorization boundary: the destination's role gate and Convex ownership checks
still apply. A person choosing an incompatible account type sees the existing
role restriction rather than receiving new permissions.

Failures during signup, sign-in, role selection, profile creation, or area saving
keep the current fields available for retry. If authentication succeeds but the
account read fails, retry the account read instead of creating a second account.
Failed sign-out does not pretend that the session ended. Late account reads are
ignored after a newer refresh or successful sign-out.

## Short developer setup

`/onboarding` asks for a short bio, tried skills, self-reported experience level,
city, and weekly availability. Learning goals and causes are optional. Projects,
detailed preferences, and the search-area map remain available in `/profile`;
they are not prerequisites to seeing the initial career flow.

Discovery visibility and unpaid-project consent start off and require explicit
opt-in. Availability starts on and collaboration starts flexible, as disclosed by
the form. This uses the existing profile API and does not infer professional
years, completed work, pay preferences, or credentials.

Already-configured developers skip setup. Project eligibility screens carry a
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

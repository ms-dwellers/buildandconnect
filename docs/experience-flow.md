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

- Requesters see saved drafts and responses before posting lists.
- Developers see responses and accepted requests before career discovery.
- Incoming interest is first, mutual connections next, and sent interest last.
- Open opportunities precede closed ones; claimed requests precede open and
  closed requests. Ordering applies to loaded pages and never mutates source data.
- Empty response and accepted-work sections do not take over the dashboard.
  Profile and availability controls remain in an expandable section and in the
  full profile editor. A list refresh failure remains visible even with old rows.

No notifications, messages, new matching rules, or automatic commitments are
introduced by this flow. Pagination remains explicit through **Load more**.

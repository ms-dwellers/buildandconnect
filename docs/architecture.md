# Architecture

## Ownership

| Concern                       | Owner                              | State                           |
| ----------------------------- | ---------------------------------- | ------------------------------- |
| Web routes and landing page   | React, Vinext App Router, Tailwind | Implemented                     |
| API routing and authorization | Hono in `backend/api.ts`           | Implemented                     |
| Accounts and sessions         | Better Auth, built-in D1 adapter   | Email/password                  |
| Application and auth data     | Cloudflare D1, `migrations/`       | Implemented                     |
| Job analysis and embeddings   | Workers AI, `backend/ai.ts`        | Requires Cloudflare access      |
| Growth matching               | `backend/matching.ts`              | Deterministic, versioned        |
| Mutual interest               | D1 interest records                | Opportunity-specific, revocable |
| Maps                          | Mapbox                             | Nearby local requests           |
| Native iOS                    | Swift                              | Deferred                        |

The backend follows the requested Hono + D1 direction, replacing the original
Convex plan. There is one Worker and one database, not a separate API server.
`app/api/[...path]/route.ts` forwards standard Requests to Hono. `/api/health`
remains a minimal public liveness route, not a provider-readiness check.

## Data and request flow

1. Better Auth signs up or signs in an account and issues an HTTP-only session
   cookie. The API retrieves the session server-side for each protected request.
2. The account chooses one immutable role: developer, company, recruiter, or
   requester. These are hackathon account types, not verified identities.
3. Developers submit explicit skills, projects, interests, learning goals, and
   discovery consent. BGE Small embeds demonstrated experience, not aspirations.
4. Companies post opportunities. Llama produces schema-constrained job analysis;
   Zod validates it. BGE Small embeds the structured requirements. Only after both
   succeed is the complete record written to D1. A failure returns 503 and saves
   nothing. Updating a profile similarly preserves its previous version on failure.
5. Companies fetch ranked candidates for their own opportunities. SQL narrows
   availability and location; deterministic hard gates and scoring run in TypeScript.
   Developers can retrieve their own match and eligibility reasons.
6. Each side can express or withdraw interest. One SQL upsert changes only that
   side's flag, preserving the other side under concurrent requests. A connection
   is the derived state where both flags are true, so no second connection record
   can drift. Withdrawal removes it from connection listings, including after close.
7. A requester posts a local request with a Mapbox pin. Developers store a separate
   pin and radius on the developer row (not in the public profile JSON). Nearby
   browse uses a bounding-box prefilter, haversine distance, and the same growth
   scoring as opportunities. Accept claims an open request exclusively; release
   returns it to open.

`schemas.ts` owns validation and domain shapes; `store.ts` owns reads and response
redaction. Store model/version metadata with analysis and embeddings. There is no
Vectorize index: exact cosine comparison is sufficient for the hackathon pool and
does not risk approximate retrieval dropping promising juniors.

## Matching

All factor scores and the overall score use a 0-100 scale. The final score uses
unrounded factors, rounded to one decimal place. Ties sort by developer ID.

| Factor               | Weight | Meaning                                                                           |
| -------------------- | ------ | --------------------------------------------------------------------------------- |
| Technical readiness  | 30%    | 75% required-technology proficiency, 25% experience/requirement cosine similarity |
| Growth potential     | 30%    | 65% desired-learning alignment, 35% supported challenge fit; scaled by readiness  |
| Developer interest   | 20%    | Shared explicit project interests; neutral when the opportunity has none          |
| Collaboration        | 10%    | Compatible async/sync preference, with flexible matching either                   |
| Opportunity exposure | 10%    | `1 / (1 + recentCompanyInterestCount / 3)`                                        |

Hard gates: available and discoverable, explicit company-designated essential
technologies, minimum weekly availability, city for non-remote projects, and
consent to volunteering. AI-extracted required technologies influence readiness
but do not automatically become hard gates. No arbitrary years-of-experience or
seniority exclusion applies. Higher experience never reduces challenge fit.

Mentorship permits a one-level supported stretch; larger gaps lower challenge
fit. Learning alignment counts requested learning targets present among project
technologies and learning opportunities, excluding skills already mastered at
level 5. Required-technology proficiency is capped at full readiness, not rewarded
without bound. Empty technical requirements are neutral rather than a free 100%.
Project difficulty and experience levels are self-reported/model estimates, not
verified certifications; matches assist human decisions, not automatic hiring.

Exposure counts distinct opportunity/company-interest records first created in
the last 30 days. Listing matches never changes it; retrying, withdrawing, and
re-expressing interest cannot inflate it within the same opportunity. This is a
small diversity boost independent of seniority, not an exclusion rule. Sybil or
colluding-company abuse prevention is outside this MVP.

## Boundaries and limitations

- Recruiters and companies can browse consented profiles and project evidence,
  not emails, auth records, embeddings, or private exposure counts. Only an
  opportunity owner sees its full candidate ranking. Only participants see their
  connections and pending interests. Visibility/availability can be changed without
  inference. There is no messaging or automatic contact-detail release.
- Use same-origin cookie requests. Mutation origins are checked; Better Auth
  retains its own CSRF/cookie protections. API responses are never shared-cached.
  Request bodies are capped at 32 KB and input fields/collections are bounded.
- Better Auth stores rate limits in D1 and trusts Cloudflare's overwritten
  `CF-Connecting-IP` header. Do not put an untrusted proxy in front that preserves
  attacker-supplied values. The rest of the API has no per-account AI quota yet;
  add quotas and email verification before opening public registration at scale.
- Synchronous inference is deliberately simple for the MVP. There is no queue,
  automatic retry, or fabricated-analysis fallback. Repeated successful posts are
  distinct opportunities, so clients should disable duplicate submission.
- Exact ranking supports up to 1,000 SQL-prefiltered profiles per opportunity;
  larger pools fail explicitly rather than return a silently incomplete ranking.
  Browse and connection endpoints use bounded cursor pagination.
- Only status is editable on opportunities in this MVP. Profile updates regenerate
  embeddings; matching always uses the latest profile. Embeddings use mean pooling,
  384 dimensions, and a bounded 1,800-character summary. Long profiles lose detail.
- No payment, messaging, verified project outcomes, identity verification, or
  account deletion UI is implemented here. Local request accept is exclusive and
  does not require requester confirmation before the claim.

## Configuration

See [backend.md](backend.md) for local database setup and the HTTP contract.
`cloudflare.config.ts` owns the DB/AI/secret bindings. `vite.config.ts` controls
local persistence and makes remote model calls opt-in. Production always uses the
real AI binding; local preview disables remote connections by default. Use Worker
secret storage for production credentials. Nothing is provisioned or deployed by
the checks.

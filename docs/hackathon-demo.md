# Hackathon demo

The demo uses fictional Calgary people and projects in the selected Convex
**development** deployment. It does not represent real vacancies, customers,
paid contracts, or completed work.

## Seed and sign in

Start the development server with remote Workers AI enabled, then run the seed
from another terminal:

```sh
WORKERS_AI_REMOTE=true bun run dev:remote
bun run seed:demo
```

The seed reads `.env.local`. `SITE_URL` must be the running localhost or private
Tailscale origin, and `CONVEX_DEPLOYMENT` must select development. Deploy keys
and public production origins are refused. Workers AI and the configured career
analysis provider make real inference calls; provider usage may be billable.

Generated sign-in credentials and record IDs are stored only in ignored
`.demo/state.json`, with private file permissions. Open that file locally and use
an account's email/password; do not paste its contents into chat, screenshots,
issues, or source control. The seed signs out its own sessions on exit.

On POSIX systems the directory is created with mode 700 and the state file with
mode 600. Windows uses the checkout's inherited ACLs; use a checkout accessible
only to your account. The Windows path has not been runtime-verified here.

Run the same command again to resume a partial seed. Keep `.demo/state.json`:
it binds these credentials to this development target. Existing profiles and
published projects are retained, edited drafts are not silently published, and
completed demo interactions are not replayed. There is no bulk reset command.
Do not delete the state file to reseed; that loses the generated passwords.

## What's included

| Account key | Role      | Demo use                                                     |
| ----------- | --------- | ------------------------------------------------------------ |
| `avery`     | Developer | Target-job requirements, related projects, incoming interest |
| `nia`       | Developer | Interest sent on the food-bank project                       |
| `samira`    | Developer | Mutual interest on the repair-café project                   |
| `theo`      | Developer | Garden interest and an accepted small community request      |
| `maya`      | Requester | Food-bank project, incoming interest, private draft          |
| `jordan`    | Requester | Repair café, mutual interest, accepted request               |

Eight mapped projects cover food security, repair, accessibility, gardening,
education, and environmental data. Six are volunteer projects and two have
clearly fictional fixed budgets. Four smaller community requests include one
accepted request. All profiles and descriptions disclose that they are demos.

The deliberately varied states are created only for these seed accounts, through
the ordinary role, profile, draft, publish, interest, and request APIs. The seed
does not alter real users, matching rules, or production data.

## Suggested presentation

1. Sign in as **Avery** and open `/career`. Show the fictional junior full-stack
   target, choose a requirement, and inspect relevant practice on a project.
2. Open the **food-bank volunteer project**. Show the actual scope, time
   commitment, and why it offers practice. Expressing interest is a separate,
   deliberate action; the seed leaves Avery's interest unset.
3. Open `/map`. Compare mapped projects and small nearby requests, including
   paid/volunteer filters and the list alternative to the map.
4. In a separate browser profile, sign in as **Maya**. Show incoming interest and
   the saved private draft. For voice intake, describe a new idea, inspect the
   draft, and stop before publishing unless a new demo listing is wanted.
5. Use **Samira** or **Jordan** to show a pre-existing mutual connection. This
   demonstrates mutual interest, not hiring, completed delivery, or a payment.

Use separate browser profiles for developer and requester sessions. Test the
voice provider before presenting; manual project entry remains available.

## Verification boundaries

The fixture tests check schemas, Calgary coordinates, reserved demo descriptions,
development-only targeting, and stable draft IDs. Runtime seeding must additionally
verify that the main project links to the saved target. Inference is real, so the
exact analysis and ranking may vary. A passing seed is not evidence that a real
person gained a skill or that any project was delivered.

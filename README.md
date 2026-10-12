# waslaeuft.in

Turborepo for the waslaeuft.in web app and future Expo clients.

## Workspaces

- `apps/nextjs`: Next.js web app and HTTP adapters
- `apps/expo`: Expo client scaffold consuming the shared tRPC contract
- `packages/api`: tRPC routers and client-safe router types
- `packages/db`: Prisma client, schema, and migrations
- `packages/validators`: schemas shared by web, API, and mobile clients
- `packages/ui`: shared UI primitives from the original starter
- `tooling/*`: shared TypeScript, ESLint, Prettier, and Tailwind config

The `@waslaeuftin/api` root export contains only types and is safe to import from
Expo. Server runtimes use `@waslaeuftin/api/server`. Prisma stays behind
`@waslaeuftin/db` and must not be imported by mobile code.

## Development

```bash
bun install
cp .env.example .env
bun run db:push
bun run dev:web
```

Start the Expo client separately:

```bash
bun --filter @waslaeuftin/expo dev
```

## CinemaxX / Vue

CinemaxX uses its direct guest API, including HOLI Hamburg. The `CinemaxxVue`
provider participates in nightly and manual updates. Each successful refresh
replaces that cinema's schedule and updates `lastFetchedAt` in one transaction;
failed or empty feeds retain the previous schedule. Manual Run actions always
refetch all cinemas for the selected providers; scheduled updates retain the
five-hour freshness filter.

To migrate existing Kinoheld cinema records without changing IDs or slugs, run
from the repository root with the database, TMDB, and S3 environment configured:

```bash
bun apps/nextjs/scripts/migrate-cinemaxx-vue-cinemas.ts
bun apps/nextjs/scripts/migrate-cinemaxx-vue-cinemas.ts --apply
```

The first command previews exact venue matches. Applying validates all feeds,
saves a rollback snapshot under `.cache`, and atomically replaces the schedules
and provider mappings. Cinemas absent from the database are reported, not created.
Deploy the provider code along with the migration so subsequent nightly updates
continue using the direct source.

## Movie matching

Matching uses the raw listing title plus observed provider evidence, not just a
cleaned title. Available film IDs, original titles, years, directors and runtimes
are retained on showings. Unconfirmed identities stay scoped to their cinema and
provider; confirmed identities merge by TMDB ID. Remakes without enough evidence,
unnamed Sneaks and multi-film programmes do not receive a guessed film identity.
Sneak and language tags remain separate from the raw display title.

Source decisions retain their matcher version, candidates, rejection evidence and
evaluation time. Positive decisions expire after seven days, abstentions after
one day; cache reuse does not renew either deadline. Version, confidence threshold
or source-evidence changes trigger reevaluation. API failures remain retryable.
Runtime evidence allows a five-minute difference; different cuts can therefore
abstain rather than receive an unsafe identity.

Explicit installments and named subtitles constrain every scoring path,
including structured original-title evidence. Shortened titles help retrieval,
but accepting an omitted subtitle requires an authoritative complete alias.
Default imports check source slots under a cinema-row transaction lock. Identity
changes are held and logged, not inserted as duplicate screenings or silently
remapped; distinct established provider film IDs can still share a title/time.

**Apply the nullable showing-provenance migration before deploying this resolver.**
The Docker entrypoint does not run migrations. Existing ambiguous rows require
separate review; importing a new decision is not a blanket historical repair.

Run these read-only diagnostics from `apps/nextjs` with the root `.env` configured:

```bash
bun run with-env -- bun scripts/update-movies/evaluate-labelled-titles.ts tests/fixtures/heldOutMovieLabels.json ../../.amp/in/artifacts/held-out-matcher-results.json
bun run with-env -- bun scripts/update-movies/plan-showing-repairs.ts ../../.amp/in/artifacts/catalog-review-queue.json ../../.amp/in/artifacts/showing-repair-dry-run.json 400
```

The repair planner accepts an audit queue shaped as
`{ "reviews": [{ "movieId": 123, "flags": ["ambiguous-stored-title"] }] }`.
It includes future showings of flagged movies and all currently unmatched movies,
prioritizes suspicious stored matches, and marks inputs beyond its evaluation
limit as unevaluated. It detects existing and competing proposed target slots.
There is no apply mode. Do not substitute the older title-only bulk cover/remap
scripts for these showing-level proposals.

The frozen 20-case held-out corpus was independently labelled before matcher
evaluation. Only raw titles are evaluated; its target metadata is not treated as
provider evidence. The initial live result was 12 correct accepts, zero wrong
accepts and eight abstentions (three intentional, five unresolved presentation
labels). This small, selected sample is not a whole-catalog accuracy estimate.

## Verification

```bash
bun run typecheck
bun run lint
bun run build
bun run test:web
```

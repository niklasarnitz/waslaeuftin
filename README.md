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

## Yorck, Cinetixx, Cineprog and UCI

All four sources participate in scheduled and manual provider updates. Configured
cinemas prefer their native programme over Kinoheld. Native film/session IDs,
observed movie evidence, rooms, version labels and raw source metadata are kept
with retrieval timestamps. Yorck's explicit TMDB IDs still pass the normal movie
identity checks; they are not unconditional matches. Unknown language,
availability and cancellation states are not inferred from sales flags.

Yorck uses its public Sessions API and film pages; Cinetixx uses its anonymous
programme JSON. Cineprog reads the embedded programme/detail data used by WOKI
and Park-Kino. UCI uses programme HTML: a Chromium network investigation found
HTML slider snippets, but no usable JSON schedule feed. Other Cineprog website
templates are not assumed compatible.

UCI blocks the production datacenter IP, including browser-like TLS clients.
Set `UCI_PROXY_URL` to the private home-egress HTTP CONNECT proxy managed in
`niklasarnitz/ops` (`stacks/uci-proxy`). It permits only delta → UCI on port 443
over Tailscale, without intercepting TLS. Discovery and programme fetches use
this proxy in both Node and Bun; other providers remain direct. Leave it empty
for local direct requests. Proxy failures fail the refresh normally, retaining
previous listings and freshness rather than silently returning an empty feed.

**Apply `20261102220000_add_native_cinema_providers` before deploying this code.**
The Docker entrypoint does not apply migrations. Then deploy the new importer
before activating any native mappings. The migration retains legacy slot keys
and adds native session identity so simultaneous rooms are not collapsed.

Use `apps/nextjs/scripts/configure-native-cinema.ts` with an existing local cinema
ID and a verified native venue mapping. Run from the repository root with the
database environment loaded. These examples are dry runs; replace the local ID
placeholder after checking the physical venue:

```text
bun apps/nextjs/scripts/configure-native-cinema.ts Yorck <local-id> 1001 delphi-lux
bun apps/nextjs/scripts/configure-native-cinema.ts Cinetixx <local-id> 301802645
bun apps/nextjs/scripts/configure-native-cinema.ts Cineprog <local-id> https://www.park-kino.de
bun apps/nextjs/scripts/configure-native-cinema.ts UCI <local-id> 82 berlin-east-side-gallery
```

Only add `--apply` after reviewing the venue and fetched programme. Applying
requires the database, TMDB and S3 environment used by the movie importer. It
saves a rollback snapshot under `.cache` and atomically activates the mapping,
refreshes listings and records freshness. Existing cinema IDs and Kinoheld
metadata remain intact; another direct-provider mapping must be retired
explicitly before switching. No cinema records are created by this script.

Failed, malformed, ambiguous-time or empty feeds leave the previous listings
and freshness intact. Successful refreshes withdraw missing future sessions,
retain historical/withdrawn rows, and update reappearing exact slots in place.
Mapping checks under the cinema lock prevent stale native/Kinoheld refreshes
from writing after a source switch. Native raw evidence remains separate from
canonical movie metadata; a native runtime disagreement does not establish
which source is correct.

## Austrian direct providers

Diesel Kino (9 locations), Star Movie (7) and Megaplex/Metropol (5) participate
in the same native-provider update pipeline. All 21 programmes were checked
against their public sites. None of these locations was present in the public
cinema directory when coverage was checked on 2026-11-06. Cinema Paradiso is
not included: its booking-link contract still needs verification.

**Apply `20261106120000_add_austrian_cinema_providers` and
`20261106130000_add_missing_tmdb_metadata_fields` before deploying this code**,
after the earlier native-provider migrations. The latter completes the existing
TMDB metadata schema so enrichment writes work on migration-created databases;
compatible existing columns/data are preserved. Regenerate the Prisma client
for local development with `bun run db:generate`.

The onboarding script validates selected programmes without connecting to the
database by default. Run from the repository root:

```sh
bun apps/nextjs/scripts/create-austrian-cinemas.ts
bun apps/nextjs/scripts/create-austrian-cinemas.ts StarMovie
```

After reviewing source permissions and physical venues, adding `--apply`
registers missing Austrian cities and cinemas in one transaction. It refuses
conflicting mappings rather than switching an existing source, and can be
rerun for matching mappings. Registration does not import showings or trigger
a deployment; the normal provider updater imports their programmes afterward.
All 21 new entries have sourced coordinates: official contact-page pins for
Star Movie and matched OpenStreetMap cinema objects for Diesel and Megaplex.
Existing coordinates are not overwritten. The
[activation runbook](packages/cinema-providers/research/austria-activation.md)
records the full inventory, coordinate provenance/attribution, deployment gates,
ordered commands, read-only acceptance queries and scoped rollback plan.
Existing cinema records can instead use `configure-native-cinema.ts`
with `DieselKino`, `StarMovie` or `Megaplex` and the verified location slug.

Diesel uses embedded structured programme data; Star Movie and Megaplex use
programme/detail HTML. Megaplex JSON-LD contains at most 20 screenings per film,
so the adapter reads the full HTML schedule and cross-checks available events.
Metropol's venue metadata intentionally uses `metropol-kino.at`. All three
adapters reject malformed or wrong-location feeds rather than withdrawing
listings on an incomplete refresh. Their public readability does not establish
redistribution rights. Deployment, migration and production onboarding require
separate approval; none is performed by the default dry run.

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

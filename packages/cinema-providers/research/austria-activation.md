# Austrian provider activation runbook

Prepared 2026-11-06. **This document grants no approval: follow the explicit
deployment request and recorded scope. Cinema activation remains a separate gate.**
Scope: DieselKino (9), StarMovie (7), Megaplex including Metropol (5).
Cinema Paradiso and shared aggregator feeds are not included.

## Readiness and stop conditions

- All 21 locations have a native mapping, public programme reader and reviewed
  geotag in `apps/nextjs/scripts/create-austrian-cinemas.ts`.
- Initial directory coverage check found none of the 21 registered. Repeat the
  database conflict check at cutover; the public directory is not a DB snapshot.
- Provider fixtures and independent review are documented in the thread report.
  Re-run release checks against the exact release commit, not this moving worktree.
- **Source reuse permission remains unverified.** Record a permitted-use decision
  for all three operators before production import; public access is not a licence.
- Production connectivity, migration history and schema were inspected read-only
  during the deployment preflight below; a fresh backup was restored locally.
  Production-host programme completeness and production end-to-end persistence
  remain cutover gates, not completed checks.
- **TMDB migration gap fixed locally:**
  `20261106130000_add_missing_tmdb_metadata_fields` adds all 11 enrichment columns
  missing from migration history. Real metadata create/update now succeeds on
  clean and seeded upgrade databases; compatible existing columns/data survive.
  Production already has compatible definitions for all 11 columns, but lacks
  this migration record. Include it in the cutover set; do not assume it is applied.
- Do not enable a provider while any of its locations fails its programme check.
  A single failed venue aborts persistence for that provider batch.
- Do not push to `main` or dispatch the Image workflow as preparation: the current
  workflow builds an image, updates `niklasarnitz/ops` and triggers deployment.

## Production preflight checklist

**Status: production inspection started; cinema activation approval remains open.**
Unchecked items are open gates, not evidence of a failed production check.
Use this checklist with the exact inventory, cutover sequence and acceptance SQL
below; do not substitute old rehearsal counts for current acceptance evidence.

### Record before inspection

- [ ] Record operator/reviewer, UTC inspection time and intended maintenance window.
- [ ] Record exact release commit, candidate image digest and currently deployed
      image digest/rollback target. Local uncommitted work is not a release artifact.
- [ ] Identify the production host, database name/role and storage bucket/endpoint
      through approved access. Record identifiers only; never copy credentials into
      this report. Confirm that inspection commands target the intended environment.
- [ ] Assign a location for restricted backup/log evidence and public-safe results;
      record links, run IDs and the person responsible for the go/no-go decision.

### Read-only gates before requesting cutover approval

- [ ] Record source-use decisions for Diesel Kino, Star Movie and Megaplex/Metropol,
      and coordinate attribution/licence obligations. Anonymous access is not consent.
- [ ] Pass typecheck, lint, workspace lint, formatting and relevant tests on the
      exact release checkout/CI run; attach results. Prior local checks do not
      certify a newer commit or the packaged image.
- [ ] Inspect production migration history/status and failures. Record **every**
      pending migration and approve the whole set, not only the two new ones.
      Expect the Austrian-provider and missing-TMDB-field migrations if unapplied;
      verify their earlier dependencies rather than assuming production is current.
- [ ] Inspect actual `TmdbMetadata` column types, nullability and defaults. Existing
      enrichment columns must match the model (two nullable TEXT, nine nullable
      JSONB); `IF NOT EXISTS` does not reconcile drift. Stop for incompatible types,
      failed migrations or unexplained history/schema differences.
- [ ] Confirm production DB connectivity and migration-role privileges, inspect
      long-running transactions/locks, and agree a maintenance/lock-wait plan.
      Do not run `migrate deploy`, `db push`, DDL or repair SQL during inspection.
- [ ] Confirm an appropriately recent, accessible backup exists; record its ID,
      timestamp, retention and restore evidence/owner. If absent or unproven,
      arrange backup/isolated restore work under separate authorization; never
      test a restore over production. Record the application rollback image too.
- [ ] Inspect the deployed job configuration and queued/running provider updates;
      identify automatic, admin and CLI entry points. Plan who prevents concurrent
      writers during cutover. Do not toggle flags or cancel jobs as preflight.
- [ ] Recheck all 21 physical venues against production records using names,
      municipalities, existing native mappings and geotags, including aliases.
      Save existing IDs/mappings and planned create/reuse decisions. Stop on
      conflicting ownership; public-directory absence alone is insufficient.
- [ ] From the intended production network, run only the programme-only dry run
      from the approved checkout **without `--apply`**. Require all 21 locations,
      9/7/5 unique source mappings, valid geotags and nonempty complete programmes.
      This reads public provider sites but does not connect to the database.
- [ ] Validate the candidate packaged image in an isolated environment with jobs
      disabled and disposable services before starting it against production.
      Confirm schema compatibility, importer/script availability and startup
      behavior. The image entrypoint does not apply migrations.
- [ ] Check production TMDB/storage configuration without exposing secret values.
      Use authorized read-only API/HEAD checks where possible; no test object uploads,
      importer runs or notification tests against shared services during preflight.
      Confirm that full import logs will be retained for metadata-warning review.

### Approval boundary and cutover handoff

- [ ] Mark a documented **NO-GO** while any required evidence is missing or any
      warning/conflict is unexplained. Record exceptions explicitly; do not silently
      treat unknown as passed. Record final reviewer and timestamp.
- [ ] Obtain explicit approval for the exact migration set, deployment mechanism,
      job quiescence, registration and three-provider imports, including expected
      shared TMDB/storage writes and notifications. A preflight request grants none
      of these permissions. Pushing `main` or dispatching Image triggers deployment.
- [ ] During approved cutover, follow the sequence below: quiesce writers; apply
      approved migrations; deploy the approved importer; revalidate programmes;
      register providers separately and save the exact new-ID delta; import each
      provider and record its run ID/start time.
- [ ] Before accepting activation, pass both listing/geotag/freshness checks and
      the mandatory metadata SQL/log gate. Inspect representative posters, booking
      URLs, Vienna times and web/mobile discovery in the running release. Optional
      enrichment may be null; accepted identities must not lose metadata links.
- [ ] Have the exact-ID scoped rollback ready, preserving history and shared
      metadata. Restore automatic jobs only after acceptance and explicit approval;
      record the person watching the next normal update and the escalation route.

### Observed deployment preflight (2026-11-06)

The user requested production deployment. Code/schema rollout can proceed without
registering new cinemas; the new mappings must stay inactive pending the recorded
source-use decision. This is not approval to run the onboarding/import commands.

- Prepared an isolated release checkout from the latest remote `main`, excluding
  unrelated local Expo/API edits. Typecheck, lint, workspace lint, formatting,
  **161 provider tests** and **412 web tests** passed there.
- Read-only production inspection found PostgreSQL 18, 17 completed migrations,
  no Austrian-provider columns, and compatible nullable TEXT/JSONB definitions
  for all 11 existing TMDB enrichment columns. Exactly the two new migrations
  are pending. The Austrian directory still contains 29 existing venues.
- Took a fresh restricted-access production dump and restored it into disposable
  local PostgreSQL 18. Restored counts: 1,313 cinemas, 45,449 movies, 539,424
  screenings and 8,044 metadata rows. Both pending migrations applied successfully
  to that copy. No production restore or schema workaround was used.
- Existing manual KinoHeld/KinoTicketsExpress jobs are recorded RUNNING/QUEUED;
  their progress timestamps predate inspection by more than 30 minutes. The
  normal server-start recovery marks stale/interrupted runs failed and notifies
  the operator; a deployment must not be reported as preserving those jobs.
- Current image health and the deployment host were inspected over trusted SSH.
  The workflow deploys through the ops image pin; the Docker entrypoint does not
  apply migrations. Full packaged-image and production rollout results must be
  recorded separately after execution, not inferred from these checks.

## Exact inventory and coordinate provenance

Coordinates use latitude, longitude (WGS84). The seven Star Movie pins come
from `.map[data-coordinates]` on each official contact page. The other 14 come
from OpenStreetMap **cinema** objects matched to the operator's name/address,
not similarly named bus stops, parking areas or Google Maps viewport centres.
Way coordinates are representative points returned by Nominatim, not entrances.

| Provider   | Native slug | Display name                    | Municipality                    |   Latitude |  Longitude | Coordinate source                                                          |
| ---------- | ----------- | ------------------------------- | ------------------------------- | ---------: | ---------: | -------------------------------------------------------------------------- |
| DieselKino | braunau     | Dieselkino Braunau              | Braunau am Inn                  | 48.2514018 | 13.0447467 | [OSM way 106447383](https://www.openstreetmap.org/way/106447383)           |
| DieselKino | bruck       | Dieselkino Bruck                | Bruck an der Großglocknerstraße | 47.2861808 | 12.8094774 | [OSM way 228361060](https://www.openstreetmap.org/way/228361060)           |
| DieselKino | fohnsdorf   | Dieselkino Fohnsdorf            | Fohnsdorf                       | 47.1849802 | 14.6849166 | [OSM node 1670043441](https://www.openstreetmap.org/node/1670043441)       |
| DieselKino | gleisdorf   | Dieselkino Gleisdorf            | Gleisdorf                       | 47.0973117 | 15.7171757 | [OSM node 6050926112](https://www.openstreetmap.org/node/6050926112)       |
| DieselKino | kapfenberg  | Dieselkino Kapfenberg           | Kapfenberg                      | 47.4398301 | 15.2877312 | [OSM node 486679770](https://www.openstreetmap.org/node/486679770)         |
| DieselKino | leibnitz    | Dieselkino Leibnitz             | Leibnitz                        | 46.7795602 | 15.5352155 | [OSM way 473755701](https://www.openstreetmap.org/way/473755701)           |
| DieselKino | lieboch     | Dieselkino Lieboch              | Lieboch                         | 46.9568516 | 15.3475336 | [OSM way 741972772](https://www.openstreetmap.org/way/741972772)           |
| DieselKino | oberwart    | Dieselkino Oberwart             | Oberwart                        | 47.2879771 | 16.1860849 | [OSM node 835036789](https://www.openstreetmap.org/node/835036789)         |
| DieselKino | stjohann    | Dieselkino St. Johann im Pongau | St. Johann im Pongau            | 47.3514095 | 13.1945465 | [OSM way 134792535](https://www.openstreetmap.org/way/134792535)           |
| StarMovie  | regau       | Star Movie Regau                | Regau                           | 47.9905188 | 13.6807888 | [Official contact](https://www.starmovie.at/star-movie-regau/kontakt/)     |
| StarMovie  | liezen      | Star Movie Liezen               | Liezen                          | 47.5618797 | 14.2562859 | [Official contact](https://www.starmovie.at/star-movie-liezen/kontakt/)    |
| StarMovie  | peuerbach   | Star Movie Peuerbach            | Peuerbach                       | 48.3435768 | 13.7719895 | [Official contact](https://www.starmovie.at/star-movie-peuerbach/kontakt/) |
| StarMovie  | ried        | Star Movie Ried                 | Tumeltsham                      | 48.2194725 | 13.4954972 | [Official contact](https://www.starmovie.at/star-movie-ried/kontakt/)      |
| StarMovie  | steyr       | Star Movie Steyr                | Dietach                         | 48.0771681 | 14.4239639 | [Official contact](https://www.starmovie.at/star-movie-steyr/kontakt/)     |
| StarMovie  | wels        | Star Movie Wels                 | Wels                            | 48.1468935 | 13.9748993 | [Official contact](https://www.starmovie.at/star-movie-wels/kontakt/)      |
| StarMovie  | tulln       | Star Movie Tulln                | Tulln an der Donau              | 48.3283577 | 16.0828892 | [Official contact](https://www.starmovie.at/star-movie-tulln/kontakt/)     |
| Megaplex   | linz        | Hollywood Megaplex PlusCity     | Pasching                        | 48.2433743 | 14.2359778 | [OSM node 4022560644](https://www.openstreetmap.org/node/4022560644)       |
| Megaplex   | stpoelten   | Hollywood Megaplex St. Pölten   | St. Pölten                      | 48.2168201 | 15.6517709 | [OSM way 64495132](https://www.openstreetmap.org/way/64495132)             |
| Megaplex   | gasometer   | Hollywood Megaplex Gasometer    | Wien                            | 48.1858681 | 16.4206646 | [OSM node 345609294](https://www.openstreetmap.org/node/345609294)         |
| Megaplex   | scn         | Hollywood Megaplex SCN          | Wien                            | 48.2684212 | 16.3984830 | [OSM node 248678536](https://www.openstreetmap.org/node/248678536)         |
| Megaplex   | metropol    | Metropol Kino                   | Innsbruck                       | 47.2692650 | 11.3901741 | [OSM node 94708619](https://www.openstreetmap.org/node/94708619)           |

Diesel address checks use official `pmkinoFrontVars.cinemaData.cinema` on
`https://{slug}.dieselkino.at/programmuebersicht/`: Erlachweg 8 (Braunau/Haselbach),
Gewerbestraße 2 (Bruck), Arena am Waldfeld 10 (Fohnsdorf), Neugasse 110 (Gleisdorf),
Lindenplatz 4 (Kapfenberg), Klostergasse 12 (Leibnitz), Kinoplatz 1 (Lieboch),
Europastraße 3 (Oberwart), Bundesstraße 14 (St. Johann).

Megaplex addresses were checked on its official `/kino/` pages:
[PlusCity](https://www.megaplex.at/kino/hollywood-megaplex-pasching), Pluskaufstraße 7;
[St. Pölten](https://www.megaplex.at/kino/hollywood-megaplex-st-poelten), Engelbert-Laimer-Straße 1;
[Gasometer](https://www.megaplex.at/kino/hollywood-megaplex-gasometer), Guglgasse 11;
[SCN](https://www.megaplex.at/kino/hollywood-megaplex-scn), Ignaz-Köck-Straße 1;
[Metropol](https://www.megaplex.at/kino/metropol-kino), Innstraße 5.

OSM data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright),
ODbL 1.0. Nominatim requests were read-only, serial and separated by at least
1.1 seconds with an identifying User-Agent. Bruck is named “Diesel” in OSM;
Gleisdorf is “Diesel-Kino”. Municipalities come from verified physical venues,
not Nominatim's sometimes surprising nested municipality labels. Preserve OSM
attribution and assess applicable licence obligations when publishing this data.

## Safe preflight now (no database connection)

Run from the repository root. These commands do not register cinemas or run
the importer. Run the same dry run from the eventual production network before
activation; local success does not prove datacenter access.

```sh
bun apps/nextjs/scripts/create-austrian-cinemas.ts
bun --cwd packages/cinema-providers test tests/austrianProviders.test.ts
```

Expect exactly 21 rows: 9 DieselKino, 7 StarMovie, 5 Megaplex, each with coordinates,
nonzero movies/screenings and official booking URLs. Counts are time-sensitive;
3,057 was a prior snapshot, not an acceptance constant. The final line must say
21 locations validated with no database connection or writes.

## Cutover sequence — requires separate explicit approval

Do not execute the following commands as part of preparation. Use an approved
release checkout, explicitly selected database environment and maintenance window.

1. Record source-permission decisions; pass release typecheck, lint, workspace lint,
   formatting and tests. Take a recoverable database backup and record the current
   image tag. Rehearse registration, persistence and rollback against a disposable
   staging database. Never use `prisma db push` for production activation.
2. Inspect pending migrations and production provider jobs. Let queued/running
   updates finish, prevent new runs during registration and record existing venue
   IDs/mappings. `BACKGROUND_JOBS_ENABLED=false` disables automatic workers in
   the current code, but does not prevent manual/admin/CLI writes. This flag must
   be verified in the running release; do not change shared settings without approval.
3. Apply migrations **before deploying the new importer**. The Austrian migration
   `20261106120000_add_austrian_cinema_providers` depends on
   `20261102220000_add_native_cinema_providers`. Also include
   `20261106130000_add_missing_tmdb_metadata_fields`, which completes the existing
   TMDB schema. It preserves compatible pre-existing enrichment columns; inspect
   their types if production has schema drift. Prisma deploy applies **all pending
   migrations**, not just these two: stop if unexpected migrations are pending
   and obtain approval for the exact set.

```sh
# Read-only inspection; requires an explicitly selected database environment.
bun --cwd packages/db run with-env -- prisma migrate status
# WRITE: only after the migration set, backup and environment are approved.
bun --cwd packages/db run with-env -- prisma migrate deploy
```

4. Deploy the approved importer release and confirm it starts against the expanded
   schema. The Docker CMD does not apply migrations. Repeat the programme-only
   dry run from the deployment host. Do not start an old importer with newly
   activated mappings and assume it knows the new providers.
5. With import jobs quiescent, register each provider separately. Review output
   after each transaction; record exactly which IDs were newly created versus
   pre-existing. No showings are imported by registration. Existing matching
   cinemas retain their coordinates; inspect them separately if registration
   reports previously registered venues.

```sh
# WRITES: intentionally not executed during preparation.
bun --cwd apps/nextjs run with-env -- bun scripts/create-austrian-cinemas.ts DieselKino --apply
bun --cwd apps/nextjs run with-env -- bun scripts/create-austrian-cinemas.ts StarMovie --apply
bun --cwd apps/nextjs run with-env -- bun scripts/create-austrian-cinemas.ts Megaplex --apply
```

6. Once the 21 mappings/geotags are correct, run only these three providers, one
   at a time, through the existing tracked updater. This writes showings and may
   persist TMDB/S3 metadata or send existing error notifications. Use the complete
   importer environment; registration alone does not need those services. Record
   each run ID and start time. Use the admin manual Run for a forced repeat;
   CLI/scheduled updates retain the five-hour freshness filter after success.

```sh
# WRITES: initial import only after separate approval.
bun --cwd apps/nextjs run with-env -- bun scripts/update-movies/updateAllMovies.ts DieselKino
bun --cwd apps/nextjs run with-env -- bun scripts/update-movies/updateAllMovies.ts StarMovie
bun --cwd apps/nextjs run with-env -- bun scripts/update-movies/updateAllMovies.ts Megaplex
```

7. Verify each provider succeeded; check every cinema's `lastFetchedAt` against
   its import start time and verify nonzero future listed screenings. Spot-check
   raw titles, Vienna-local times, rooms/formats, native booking URLs, nearby
   search and the Ried/Tumeltsham, Steyr/Dietach and PlusCity/Pasching identities.
   **Provider success is not metadata acceptance.** Review the complete logs for
   each activation run for `Could not fetch/store TMDB metadata`, `P2022`,
   missing-metadata warnings and other enrichment failures. Resolve unexplained
   warnings and pass the metadata reconciliation below before accepting a run.
   Restore normal automatic jobs only after both gates and separate approval.

## Read-only post-registration checks

These statements need the Austrian migration first. They do not modify data.
Expected provider totals are 9 / 7 / 5 and zero missing geotags. Save the exact
ID list and compare with the pre-registration snapshot before any rollback.

```sql
BEGIN READ ONLY;
SELECT id, name, country, latitude, longitude, "lastFetchedAt",
       "dieselKinoSlug", "starMovieSlug", "megaplexSlug"
FROM "Cinema"
WHERE "dieselKinoSlug" IS NOT NULL OR "starMovieSlug" IS NOT NULL
   OR "megaplexSlug" IS NOT NULL
ORDER BY id;

SELECT count(*) FILTER (WHERE "dieselKinoSlug" IS NOT NULL) AS diesel,
       count(*) FILTER (WHERE "starMovieSlug" IS NOT NULL) AS star,
       count(*) FILTER (WHERE "megaplexSlug" IS NOT NULL) AS megaplex,
       count(*) FILTER (WHERE latitude IS NULL OR longitude IS NULL) AS missing_geotags
FROM "Cinema"
WHERE "dieselKinoSlug" IS NOT NULL OR "starMovieSlug" IS NOT NULL
   OR "megaplexSlug" IS NOT NULL;

SELECT c.id, c.name, c."lastFetchedAt", count(s.id) AS future_listed_screenings
FROM "Cinema" c
LEFT JOIN "Showing" s ON s."cinemaId" = c.id
  AND s."isListed" = true AND s."dateTime" > CURRENT_TIMESTAMP
WHERE c."dieselKinoSlug" IS NOT NULL OR c."starMovieSlug" IS NOT NULL
   OR c."megaplexSlug" IS NOT NULL
GROUP BY c.id, c.name, c."lastFetchedAt"
ORDER BY c.id;
ROLLBACK;
```

## Mandatory metadata acceptance

Run after the three imports, with jobs still quiescent. First verify that the
mapped cinema IDs above match the reviewed activation inventory; these queries
cover future listed screenings owned by those native mappings, not unrelated
providers, historical rows or withdrawn sessions. They are read-only and need
both new migrations. Save results with the exact run IDs and reviewed logs.

Expect one row for each provider, positive `future_screenings`, and **zero in
every `*_failures` column**. Missing provider rows fail acceptance. An explicit
`acceptedCandidate: null` is a legitimate unmatched film, not a missing metadata
record. Zero accepted matches needs investigation/sign-off, not a fabricated
match or a fixed expected count. For accepted matches, require the exact TMDB
link, metadata record and object-shaped raw details with the same ID and a title.
Missing/malformed evaluation evidence also fails rather than hiding a gap.

```sql
BEGIN READ ONLY;
WITH scoped AS (
  SELECT s.id, s."sourceProvider", s."matchEvaluation",
         s."matchEvaluation" -> 'acceptedCandidate' AS candidate,
         m."tmdbMovieId", t."tmdbId", t."rawDetails"
  FROM "Showing" s
  JOIN "Cinema" c ON c.id = s."cinemaId"
  JOIN "Movie" m ON m.id = s."movieId"
  LEFT JOIN "TmdbMetadata" t ON t."tmdbId" = m."tmdbMovieId"
  WHERE s."isListed" AND s."dateTime" > CURRENT_TIMESTAMP
    AND ((s."sourceProvider" = 'DieselKino' AND c."dieselKinoSlug" IS NOT NULL)
      OR (s."sourceProvider" = 'StarMovie' AND c."starMovieSlug" IS NOT NULL)
      OR (s."sourceProvider" = 'Megaplex' AND c."megaplexSlug" IS NOT NULL))
), checked AS (
  SELECT *, candidate IS NOT NULL AND candidate <> 'null'::jsonb AS accepted,
         jsonb_typeof("matchEvaluation") IS DISTINCT FROM 'object'
           OR NOT COALESCE("matchEvaluation" ? 'acceptedCandidate', false)
           AS evaluation_failure
  FROM scoped
)
SELECT "sourceProvider", count(*) AS future_screenings,
       count(*) FILTER (WHERE accepted) AS accepted_screenings,
       count(*) FILTER (WHERE evaluation_failure) AS evaluation_failures,
       count(*) FILTER (WHERE accepted AND (
         jsonb_typeof(candidate) IS DISTINCT FROM 'object'
         OR jsonb_typeof(candidate -> 'tmdbMovieId') IS DISTINCT FROM 'number'
         OR NOT COALESCE(candidate ->> 'tmdbMovieId' ~ '^[1-9][0-9]*$', false)
       )) AS candidate_failures,
       count(*) FILTER (WHERE accepted AND (
         "tmdbMovieId"::text IS DISTINCT FROM candidate ->> 'tmdbMovieId'
         OR "tmdbId" IS NULL
       )) AS link_failures,
       count(*) FILTER (WHERE accepted AND (
         jsonb_typeof("rawDetails") IS DISTINCT FROM 'object'
         OR "rawDetails" ->> 'id' IS DISTINCT FROM candidate ->> 'tmdbMovieId'
         OR jsonb_typeof("rawDetails" -> 'title') IS DISTINCT FROM 'string'
         OR COALESCE(btrim("rawDetails" ->> 'title'), '') = ''
       )) AS detail_failures
FROM checked
GROUP BY "sourceProvider"
ORDER BY "sourceProvider";

-- Representative accepted film per provider; inspect more when evidence varies.
SELECT DISTINCT ON (s."sourceProvider")
       s."sourceProvider", s.id AS showing_id, m.name,
       s."matchEvaluation" #>> '{acceptedCandidate,tmdbMovieId}' AS expected_tmdb_id,
       m."tmdbMovieId", t."rawDetails" ->> 'title' AS detail_title,
       t.certification, t."trailerUrl", t.directors,
       t."productionCountries", t."spokenLanguages", t."collectionJson"
FROM "Showing" s
JOIN "Cinema" c ON c.id = s."cinemaId"
JOIN "Movie" m ON m.id = s."movieId"
LEFT JOIN "TmdbMetadata" t ON t."tmdbId" = m."tmdbMovieId"
WHERE s."isListed" AND s."dateTime" > CURRENT_TIMESTAMP
  AND s."matchEvaluation" -> 'acceptedCandidate' IS NOT NULL
  AND s."matchEvaluation" -> 'acceptedCandidate' <> 'null'::jsonb
  AND ((s."sourceProvider" = 'DieselKino' AND c."dieselKinoSlug" IS NOT NULL)
    OR (s."sourceProvider" = 'StarMovie' AND c."starMovieSlug" IS NOT NULL)
    OR (s."sourceProvider" = 'Megaplex' AND c."megaplexSlug" IS NOT NULL))
ORDER BY s."sourceProvider", s.id;
ROLLBACK;
```

Inspect raw details/enrichment against the source response for representative
accepted films from all three providers. Certification, trailer, cast, collection
and other optional fields may legitimately be null/absent; do not require every
field or the rehearsal's counts. Stop on unexplained link/detail gaps or importer
warnings even if freshness, listing counts and tracked run statuses look healthy.
The queries cannot recover warnings from database rows: retaining/reviewing the
actual importer logs is a separate mandatory part of this gate.

## Rollback plan — do not delete history

- Before registration: abort; additive nullable columns can remain. Do not drop
  columns or reverse migration history as an automatic rollback.
- Registration failure: that provider's transaction rolls back; inspect the error.
  Other providers registered earlier are unaffected, so do not assume all-or-none.
- Import failure: that provider's native schedule replacement does not commit.
  Inspect the tracked failed run and preserve evidence; do not clear previous
  showings to hide a failure. Earlier successful providers remain activated.
- If withdrawing this rollout is approved: quiesce jobs, then atomically clear
  only newly activated mappings and mark only their future showings unlisted,
  using the exact reviewed ID delta and row locks. Keep historical records,
  cities/cinemas, movie metadata and additive schema. Never broadly clear every
  Austrian mapping, remove all Austrian cinemas or delete shared TMDB/S3 data.
- If rolling back the application image, first neutralize new mappings as above.
  Leave columns in place and restore normal jobs only after checking old/new
  importer ownership. Restoring a whole database backup is a last resort with
  separately reviewed impact on unrelated production writes.

## Preparation validation (2026-11-06)

- Full database-free live dry run: **21/21 locations**, **3,057 screenings**
  (Diesel 955, Star 921, Megaplex 1,181). Independently checked 9/7/5 unique slugs,
  positive programme counts, finite Austrian coordinates and sample booking URLs.
- Austrian public-function fixtures: **20 passed, 0 failed**.
- Web and provider package typechecks passed; onboarding ESLint, scoped
  README/runbook/script Prettier and `git diff --check` passed.
- Public-only evidence: `.amp/in/artifacts/austria-activation-dry-run.jsonl`.
- At this initial checkpoint, registration transactions, SQL acceptance queries
  and importer persistence had not been executed. The subsequent local rehearsal
  below covers these paths; production gates remain open.
- Changes are local/uncommitted; nothing was pushed, migrated, registered,
  imported or deployed to production.

## Disposable local rehearsal (2026-11-06)

Exercised the real Prisma migration CLI, onboarding script and tracked provider
updater against PostgreSQL 17 and a real local Versity S3 gateway. Both services
were isolated containers with loopback-only ports and tmpfs data. Child processes
used `bun --no-env-file` and an explicit environment: no production database,
storage, notification, analytics or diagnostic credentials. Only the existing
TMDB read credential was selected; external HTTP operations were restricted to
GET/HEAD on official provider/TMDB hosts. Official HTML was fetched once and
replayed for repeat/failure runs, avoiding repeated source crawling. TMDB matching
and image downloads were real read-only calls, not mocked successes.

Observed cases:

- **Migrations:** all 18 applied from empty; a second deploy had no pending work.
  A second local database applied the previous 17 migrations, seeded an existing
  German Yorck cinema/screening, then applied only the Austrian migration.
  Hashes of the pre-existing cinema fields and showing matched before/after.
  Country and exclusive-native constraints rejected invalid mappings.
- **Registration:** exactly 21 venues, correct 9/7/5 mappings, municipalities and
  geotags. Repeating registration added no rows and preserved an intentionally
  adjusted existing coordinate. Active jobs and conflicting sources caused
  registration to reject without changing venue/showing state.
- **Import:** three successful real CLI runs persisted **3,043 sessions**:
  Diesel 955, Star 921, Megaplex 1,167. This is a newer snapshot than the earlier
  3,057 dry run. Reconciled each native session's cinema, provider/film/session
  IDs, raw title, absolute time, booking URL, provider tags and retained provenance.
  All 21 successful-fetch timestamps advanced. Runbook acceptance SQL executed
  successfully. **57 real poster objects** were stored only in local S3; a HEAD
  check confirmed a nonempty image and all stored cover URLs were local.
- **Refresh:** forced another full fetch/persistence pass instead of testing only
  the freshness skip. No duplicate showing rows; three seeded obsolete future
  sessions were withdrawn and three historical native sessions were retained.
- **Failure and recovery:** a deliberate Diesel/Gleisdorf 503 after earlier
  venues fetched left all listings/freshness unchanged. A real PostgreSQL trigger
  exception during Megaplex persistence rolled back schedule withdrawal, inserts
  and freshness atomically. Both failed tracked runs were recorded; removing
  the faults and rerunning succeeded. Canonical movie/cache writes are outside
  the schedule transaction; this does not claim those roll back too.
- **Scoped rollback:** cleared only the 21 newly activated mappings and withdrew
  their future listings. All **3,051 showing rows** remained (3,043 imported plus
  eight controls), all 22 cinema records remained, historical native screenings
  stayed listed, and the unrelated German cinema/past/future listings were
  unchanged. Subsequent runs of all three providers fetched zero venues/showings.

**The initial rehearsal was not a clean release pass:** all attempted TMDB metadata upserts in the initial
run failed with Prisma `P2022`, reporting missing `TmdbMetadata.certification`;
the metadata row count stayed **zero**, despite successful matching and posters.
The schema field and writer predate this Austrian change. No `db push`, schema
workaround or migration fix was applied during that first rehearsal. Subsequent
diagnosis identified 11 missing columns, not just `certification`; the additive
repair and its validation are recorded below. Production schema state remains
unknown. The original failure was not evidence that listing persistence failed.

Sanitized command logs and initial/final summaries are retained under
`.amp/in/artifacts/austria-rehearsal/`. Disposable container/database/object data
and scratch tooling were removed after verification. No production actions,
commits, pushes or deployments were performed. The packaged deployment image,
production network, backups and web/mobile discovery UI were not exercised by
this local backend rehearsal; source-reuse permission still needs review.

## TMDB repair and successful local rerun (2026-11-06)

The gap covered **11 columns**, not only `certification`: `trailerUrl`,
`rawDetails`, `directors`, `cast`, `crew`, `productionCompanies`,
`productionCountries`, `spokenLanguages`, `collectionJson` and `keywordsJson`
were also absent from the migration chain. The forward-only migration
`20261106130000_add_missing_tmdb_metadata_fields` adds nullable TEXT/JSONB
columns matching the existing Prisma model. `ADD COLUMN IF NOT EXISTS` preserves
compatible pre-existing columns/data; it does not fix incompatible column types
or backfill metadata. No existing migration, schema model or writer was changed.

- **Before/after:** the real metadata writer failed with `P2022` on the previous
  18-migration schema. After applying migration 19, real create/update checks
  passed for all 11 fields, exact JSONB values and budget/revenue exceeding
  32-bit integers. A scratch expected-value error initially omitted the writer's
  existing `englishName: null`; that invalid check was corrected and rerun, with
  no application-code workaround.
- **Upgrade safety:** a second database had existing `certification`/`rawDetails`
  columns, populated metadata and related movie/cinema/showing controls. Migration
  and writer checks passed there too; all four before/after row hashes matched.
  Prisma diff against the repaired main database reported **no difference** from
  the current schema; repeat deploy had no pending migrations. No `db push` used.
- **Real activation:** all 21 venues registered and three tracked CLI imports
  persisted **2,953 sessions** (Diesel 955, Star 921, Megaplex 1,077), **56 real
  TMDB metadata records** and **56 local poster objects**. All 56 metadata rows
  had raw details and actual movie foreign-key links; **2,094 screenings** had
  accepted TMDB matches with the expected linked IDs. SQL independently found
  populated values across all 11 enrichment columns, including 46 certifications,
  50 trailers and 13 collections. Successful imports, refresh and recovery logged
  no metadata-write warnings or `P2022` errors. Counts are a later source snapshot,
  not a reduction caused by the migration; elapsed source sessions are excluded.
- **Regression cases:** exact native identities/titles/times/links/tags/provenance,
  all 21 freshness timestamps, acceptance SQL, registration idempotence, existing
  coordinate preservation, active-job/conflicting-source rejection, forced refresh
  without duplicates, history retention and stale-listing withdrawal passed again.
  Injected upstream 503 and real transaction failure preserved schedule/freshness;
  both recovered after removing the faults.
- **Scoped rollback:** all **2,961 showing rows**, all 22 cinemas and all 56 shared
  metadata records remained. Only the 21 new mappings and their future listings
  were deactivated. Historical listings and the unrelated German cinema/control
  showings were unchanged; subsequent provider runs imported zero venues/showings.
- **Code checks:** workspace typecheck, database-package typecheck, **161 provider
  tests** (including all 20 Austrian fixtures) passed. This is a local backend
  rehearsal, not packaged-image, production, backup-recovery or UI verification.

Sanitized evidence: `.amp/in/artifacts/tmdb-rehearsal/`, including metadata
acceptance SQL, before/after writer logs, preservation hashes and full tracked-run
summaries. Disposable services/data and scratch tooling were removed after verification.
The migration and documentation remain local/uncommitted. No production changes,
commits, pushes or deployments were made. Source-use permission and production
preflight/approval remain required; the local TMDB migration blocker is resolved.

## Metadata acceptance gate validation (2026-11-06)

The review found no migration implementation blocker, but one P1 activation
acceptance gap: successful runs could hide metadata-write failures. The mandatory
log review and SQL reconciliation above address that finding; restoring jobs now
requires both listing and metadata acceptance. Production gates remain open.

Validated the SQL extracted directly from this Markdown against a disposable,
loopback-only PostgreSQL 17 database with all 19 migrations. These were synthetic
fixtures (one venue per provider plus an unrelated German control), not another
live 21-venue import or production verification. No TMDB/storage credentials or
external HTTP requests were needed.

- **18 fixture scenarios passed:** healthy linked metadata with optional-null
  enrichment and explicit unmatched films was accepted; absent/wrong/deleted
  metadata links, SQL/JSON-null or malformed details, wrong detail identity,
  blank/non-string titles, missing/malformed evaluation or candidate IDs, and
  missing provider output were detected. Historical, withdrawn, unrelated and
  wrong-owner control screenings were excluded from the reconciliation.
- The representative query returned an accepted film for each provider. Empty
  results were rejected under the documented missing-provider rule. Database
  rows were identical before/after executing both queries; PostgreSQL rejected
  an attempted UPDATE inside their read-only transaction.
- Log-review markers were checked against the retained original failed-rehearsal
  log, which contains both the metadata warning and `P2022`. SQL alone cannot
  detect transient warnings that left no database gap; log review stays mandatory.

Evidence: `.amp/in/artifacts/metadata-gate/` contains migration/validation logs,
positive query output, read-only write denial and per-case count summaries.
Disposable database/container and scratch tooling were removed after validation.
Only this runbook changed; no runtime behavior, production data or deployment
was changed, and no commit or push was made.

# Austrian operators beyond Cineplexx

Researched: **2026-11-06**. Scope: Star Movie, Hollywood Megaplex, Diesel Kino,
and Cinema Paradiso. All observations below came from public first-party HTML,
JavaScript, or a read-only GraphQL query. No production database was accessed;
no accounts, reservations, carts, or purchases were created.

## Recommendation ranking

| Rank | Candidate                     | Locations verified in official directory | Observable integration route                                                                                                    | Recommendation                                                                                                                                      |
| ---- | ----------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Diesel Kino                   | 9                                        | Programme HTML embeds parseable `pmkinoFrontVars` JSON with movie, cinema and performance records, including booking deep links | Best combination of reach and structured data. Validate compatibility with the existing pmkino reader before deciding between reuse and an adapter. |
| 2    | Star Movie                    | 7                                        | Server-rendered programme cards contain film IDs, booking `programId`, Unix timestamps and format labels                        | Straightforward dedicated HTML adapter; seven programme pages returned showtime links.                                                              |
| 3    | Hollywood Megaplex / Metropol | 5, including separately branded Metropol | Programme pages enumerate film pages; film pages contain `Movie` / `ScreeningEvent` JSON-LD and booking anchors                 | Dedicated two-stage crawler is feasible. More requests than Star Movie; preserve booking IDs from HTML, not JSON-LD alone.                          |
| 4    | Cinema Paradiso               | 2                                        | Public GraphQL endpoint returned current performances for both locations                                                        | Strong structured-data lead, but main location pages returned HTTP 500 and booking deep-link construction is unverified.                            |

This is an implementation-priority ranking, not an audience-size ranking. The
counts total **23 operator-listed locations**, not 23 guaranteed net-new cinemas
in waslaeuftin at the initial research stage. The follow-up live-directory
check below found none of these locations registered.
Baseline provider support was supplied by the caller; this note does **not**
assert that any candidate already works through Cinetixx, Cineprog, Kinoheld,
Comtrada/CineOrder, KinoTicketExpress, or another generic provider.

## Live coverage check: 2026-11-06, 12:17 Europe/Berlin

**Result: 0 of the 23 shortlisted locations are present in the live cinema
directory. All 23 are net-new directory additions.**

Source: anonymous GET to the deployed `cities.getCities` tRPC procedure at
`https://waslaeuft.in/api/trpc/cities.getCities?input=%7B%22json%22%3A%22%22%7D`.
It returned 791 cities and 1,313 cinemas, including 29 cinemas in 18 Austrian
cities. Every city's returned cinema-array length matched `_count.cinemas`.
The repository procedure has no pagination or showing-based filter: it lists
configured cinema rows even when they have no current showings. This was a
complete-directory comparison, not the top-five search endpoint.

| Operator                      | Locations checked, all absent                                                                              | Existing | New    |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------- | -------- | ------ |
| Diesel Kino                   | Braunau, Bruck/Glstr., Fohnsdorf, Gleisdorf, Kapfenberg, Leibnitz, Lieboch, Oberwart, St. Johann im Pongau | 0        | 9      |
| Star Movie                    | Regau, Liezen, Peuerbach, Ried/Tumeltsham, Steyr/Dietach, Wels, Tulln                                      | 0        | 7      |
| Hollywood Megaplex / Metropol | PlusCity/Pasching, St. Pölten, Gasometer/Vienna, SCN/Vienna, Metropol/Innsbruck                            | 0        | 5      |
| Cinema Paradiso               | Baden, St. Pölten                                                                                          | 0        | 2      |
| **Total**                     |                                                                                                            | **0**    | **23** |

All 29 Austrian directory entries belong to the previously researched Cineplexx
catalogue, including its differently branded venues. In particular, Innsbruck
contains Cineplexx Innsbruck, not Metropol; Vienna contains the nine existing
Cineplexx-catalogue venues, neither Megaplex. The complete cross-country name
scan found similarly named German cinemas (including Cinema Paradiso in
Bargteheide and several Metropol cinemas), not Austrian matches.

Direct SQL access was unavailable because Tailscale was stopped on the runner;
no network settings were changed. Therefore internal provider mappings,
`lastFetchedAt` and historical showings were not queried. Since no target cinema
row appears in the complete live directory, there is no registered target to
check for active showings through this API. This establishes deployed-directory
absence, not the state of another environment or pending unpublished changes.
No database writes or provider runs were performed.

**Simplest direct source:** Diesel's programme HTML is the strongest first
choice: one response per location already supplies structured movie/showtime
joins and booking URLs. Star Movie is the simplest HTML-only fallback, also
one programme response per location. Megaplex requires film-detail fetches;
Paradiso has a verified structured query but an unresolved booking-link gap.
Reuse rights remain unverified for every source.

### Companion platform research

See [Austria platforms](./austria-platforms.md) for the parallel shared-platform
investigation. The caller reports that anonymous
<https://api.cineamo.com/cinemas?countryCode=AT> returned 116 Austrian records
over 12 pages, and `/showings?cinemaId=ID` returned UTC times and booking links
for Megaplex Gasometer (`1442`), Dieselkino Bruck (`1444`), Star Movie Regau
(`1481`), and Paradiso Baden (`1445`). These are **companion-research findings,
not independently fetched in this direct-source investigation**. Cineamo may
offer a common route across these operators, but overlaps/duplicates and
unverified reuse rights prevent treating that as a licensed replacement for
the direct sources below. Record counts are not unique active-cinema counts.

## 1. Diesel Kino

### Current locations and official programme URLs

The [official selector](https://dieselkino.at/) lists nine cinema subdomains.
The cinema records embedded in the
[Gleisdorf programme response](https://gleisdorf.dieselkino.at/programmuebersicht/)
independently enumerate the same nine single-cinema entries, plus a separate
`multi` chain container named Diesel Kino; do not count that container as a tenth
cinema. The names and cinema numbers below are response data, not inferred IDs.

| Location                               | Official programme                                     | `dieselCinemaNumber` | Performance records returned |
| -------------------------------------- | ------------------------------------------------------ | -------------------- | ---------------------------- |
| Braunau am Inn                         | <https://braunau.dieselkino.at/programmuebersicht/>    | `90`                 | 116                          |
| Bruck/Glstr. (official response label) | <https://bruck.dieselkino.at/programmuebersicht/>      | `07`                 | 92                           |
| Fohnsdorf                              | <https://fohnsdorf.dieselkino.at/programmuebersicht/>  | `03`                 | 91                           |
| Gleisdorf                              | <https://gleisdorf.dieselkino.at/programmuebersicht/>  | `04`                 | 142                          |
| Kapfenberg                             | <https://kapfenberg.dieselkino.at/programmuebersicht/> | `80`                 | 76                           |
| Leibnitz                               | <https://leibnitz.dieselkino.at/programmuebersicht/>   | `01`                 | 88                           |
| Lieboch                                | <https://lieboch.dieselkino.at/programmuebersicht/>    | `20`                 | 136                          |
| Oberwart                               | <https://oberwart.dieselkino.at/programmuebersicht/>   | `06`                 | 127                          |
| St. Johann im Pongau                   | <https://stjohann.dieselkino.at/programmuebersicht/>   | `05`                 | 92                           |

Counts are snapshots of embedded records, not assurances about available seats,
film-only programming, deduplication, or the number of future bookable shows.

### Verified response data

Each of the nine programme pages returned an inline assignment
`var pmkinoFrontVars = {...};` that could be decoded with a JSON parser.
Relevant paths in the sampled Gleisdorf response:

- `apiData.cinemas.items`: cinema identity, website, `scope.type`,
  `scope.cinemaDataProvider.type: "dieselV2"`, cinema number, and
  `cinemaLocalTimezone: "Europe/Berlin"`.
- `apiData.movies.items`: 60 movie records, with `pk`, `id`, `title`,
  `origTitle`, `length`, `images`, `technologyAttributes`, `alternativeIds`,
  and references to performances.
- `apiData.performances.items`: 142 performance records; fields include
  `refPk`, `moviePk`, `id`, `attributes`, `theatreID`, `theatreName`,
  `timeUtc`, `cinema`, `limitations`, and `deeplinkURL`.

One returned performance (selected fields):

```json
{
  "refPk": "09bbad2c-b06c-4620-8428-172c81f6a710-988051",
  "moviePk": "09bbad2c-b06c-4620-8428-172c81f6a710",
  "id": "988051",
  "deeplinkURL": "https://kinoapi.dieselkino.at/?performanceId=988051d&cinemaNumber=04",
  "theatreID": "gleisdorf_7",
  "theatreName": "Saal 7",
  "timeUtc": 1794334500000,
  "cinema": "5a8b27d9-c3f2-42fb-a6ba-d4e2960fd47e"
}
```

The official
[softline-cinema-client.js](https://dieselkino.at/wp-content/themes/pmkino/assets-static/diesel-iframe/softline-cinema-client.js)
defines `SoftlineDieselkino` and creates a hidden iframe at
<https://kinoapi.dieselkino.at/>. Its postMessage methods concern authentication
and the cart. This verifies a Softline-named booking integration in the site's
own code, **not** a public showtime API contract or generic-provider match.

### Proposed route and uncertainties

Read the programme HTML and extract the JSON assignment without evaluating
JavaScript; join movies and performances by `moviePk`. Keep supplied deep links
verbatim: the booking `performanceId` has a trailing `d` in this example while
the plain performance `id` does not. Use `timeUtc` as milliseconds; sampled
`date` and `showtime` fields were null. Respect visibility/purchase limitations.

The pmkino naming/shape makes existing-reader reuse worth checking, but neither
the caller's Comtrada/CineOrder support nor the use of a pmkino theme proves
that Diesel is Comtrada or that the existing parser accepts `dieselV2`. No
separate programme JSON endpoint, permission to crawl, feed SLA, or booking
completion was established. The observed WordPress forms `apiUrl` is not
evidence of a programme feed.

## 2. Star Movie

### Current locations and official programme URLs

The [official homepage](https://www.starmovie.at/) embeds `App.locations`,
listing these seven entries and their programme URLs. All seven programme
responses were fetched and contained `data-program-time` showtime anchors.

| Location  | Official programme                                        | Showtime anchors observed |
| --------- | --------------------------------------------------------- | ------------------------- |
| Regau     | <https://www.starmovie.at/star-movie-regau/programm/>     | 160                       |
| Liezen    | <https://www.starmovie.at/star-movie-liezen/programm/>    | 94                        |
| Peuerbach | <https://www.starmovie.at/star-movie-peuerbach/programm/> | 103                       |
| Ried      | <https://www.starmovie.at/star-movie-ried/programm/>      | 142                       |
| Steyr     | <https://www.starmovie.at/star-movie-steyr/programm/>     | 133                       |
| Wels      | <https://www.starmovie.at/star-movie-wels/programm/>      | 177                       |
| Tulln     | <https://www.starmovie.at/star-movie-tulln/programm/>     | 121                       |

Anchor counts are raw HTML counts, not normalized show counts.

### Verified response data and proposed route

The [Regau programme](https://www.starmovie.at/star-movie-regau/programm/)
contains server-rendered `.movie-card` elements with `data-movie-id`,
`data-tags`, `data-dates`, film links and `.showings__content[data-date]` groups.
A showtime anchor contains, for example:

- Booking href:
  <https://www.starmovie.at/star-movie-regau/memberbereich/online-reservierung/?programId=163032>
- `data-program-time="1794308400"` (seconds, unlike Diesel's milliseconds).
- Visible label `12:00 2D`, inside date group `2026-11-10`.
- Other returned labels include `2D/Atmos/OV`; `purchase-only` and
  `is-expired` state handling are present in the site's code.

The first-party [footer JavaScript](https://www.starmovie.at/js/footer11.min.js?1791872609)
compares `programTime` with `Date.now()/1000`, corroborating the timestamp unit.
It also handles the on-site timetable and seat-selection flow.

Use an operator-specific HTML reader with location-scoped film IDs and booking
`programId` values. Parse only actual showtime cards: the response also contains
advance-release cards without current performances. Keep the format/version
labels rather than guessing language from the title.

**Unverified:** no documented programme feed or named third-party booking
platform was established. TYPO3/pixelart site branding and first-party
`/ajax/{location}/status` code do not prove a reusable cinema-data API. The
booking URL above was observed in programme HTML; a purchase was not attempted.

## 3. Hollywood Megaplex and Metropol

### Current locations and official URLs

The [official cinema directory](https://www.megaplex.at/kino) lists five cinemas,
including separately branded Metropol. It supplies `MovieTheater` JSON-LD and
an explicit JavaScript slug/ID map. `linz` denotes **PlusCity in Pasching**,
not a second cinema in Linz.

| Cinema                                | Official venue page                                          | Programme                                        | Site cinema ID |
| ------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------ | -------------- |
| Hollywood Megaplex PlusCity, Pasching | <https://www.megaplex.at/kino/hollywood-megaplex-pasching>   | <https://www.megaplex.at/kinoprogramm/linz>      | `2`            |
| Hollywood Megaplex St. Pölten         | <https://www.megaplex.at/kino/hollywood-megaplex-st-poelten> | <https://www.megaplex.at/kinoprogramm/stpoelten> | `1`            |
| Hollywood Megaplex Gasometer, Wien    | <https://www.megaplex.at/kino/hollywood-megaplex-gasometer>  | <https://www.megaplex.at/kinoprogramm/gasometer> | `12`           |
| Hollywood Megaplex SCN, Wien          | <https://www.megaplex.at/kino/hollywood-megaplex-scn>        | <https://www.megaplex.at/kinoprogramm/scn>       | `13`           |
| Metropol Kino, Innsbruck              | <https://www.megaplex.at/kino/metropol-kino>                 | <https://www.megaplex.at/kinoprogramm/metropol>  | `14`           |

### Verified response data and proposed route

All five programme URLs returned film links. In the fetched responses they
contained **no direct `/ticket/` anchors**, so a programme-only scraper would
miss the observed booking links. A date-specific route also exists, e.g.
<https://www.megaplex.at/kinoprogramm/linz/2026-11-06>.

The first-party film page
<https://www.megaplex.at/film/linz/kommissar-jennerwein> returned:

- `Movie` JSON-LD: title `Kommissar Jennerwein - Hochsaison`, image,
  release date, genres, and other film metadata.
- `ScreeningEvent` JSON-LD with `startDate: "2026-11-06T18:00:00"`,
  location `Hollywood Megaplex PlusCity`, and `workPresented.@id` referencing
  that page's `#movie`. Another HTML slot was 20:00.
- Corresponding HTML booking anchors
  <https://www.megaplex.at/ticket/58660/546988> (18:00) and
  <https://www.megaplex.at/ticket/58660/546987> (20:00), marked `2D`.

The event JSON-LD `url` is the **film page**, not the ticket link. Combine
structured events with their HTML date groups and booking anchors; do not
silently substitute the event URL for a performance-specific booking URL.
Deduplicate programme film links before fetching details. The sampled
`startDate` has no timezone offset; interpret local times explicitly as
Austria/Europe/Vienna, checking rollover and DST cases during implementation.

A GET of the first ticket link returned a login-oriented page with the
ticket path preserved in `returnUrl`; no login or checkout action was performed.
The directory links site credits to <https://itpmcc.at/>, but that alone does
not identify a booking backend or prove compatibility with an existing generic
provider. No separate public JSON programme feed was verified.

## 4. Cinema Paradiso

### Locations and availability caveat

The functioning [official location selector](https://www.cinema-paradiso.at/)
links **St. Pölten** (<https://www.cinema-paradiso.at/st-poelten>) and
**Baden** (<https://www.cinema-paradiso.at/baden>). Both location-page GETs
returned **HTTP 500** during this research. Nevertheless, read-only queries to
the public first-party API returned performances for both locations. Treat the
failure as observed availability, not evidence that either cinema is closed.

### Verified frontend contract and actual API response

The selector loads this first-party JavaScript bundle:
<https://www.cinema-paradiso.at/_next/static/chunks/9198-3cb935e86e63c543.js>.
It contains programme queries sent as JSON POST requests to
<https://api.cinema-paradiso.at/graphql/>. Its selectors include
`parent=/film-db/vorstellungen/{location}/`, `vorstellung_termin>now`,
`vorstellung_status.title!=verborgen`, and sorting by `vorstellung_termin`.
This is not just an endpoint guessed from a hostname: the following bounded
read query was submitted successfully for both slugs.

```graphql
query {
  vorstellung(
    s: "parent=/film-db/vorstellungen/baden/,vorstellung_termin>now, vorstellung_status.title!=verborgen,sort=vorstellung_termin,limit=2"
  ) {
    list {
      title
      id
      cinative_id
      vorstellung_termin
      vorstellung_saal
      vorstellung_filmpage {
        list {
          name
          ... on FilmPage {
            title
            cinative_id
          }
        }
      }
    }
  }
}
```

Request header: `Content-Type: application/json`; body: `{"query":"..."}`.
No authentication header was supplied. Selected actual returned values:

| Location   | Title                                          | CMS performance ID | Performance `cinative_id` | Local date/time string | Hall | Film `cinative_id` |
| ---------- | ---------------------------------------------- | ------------------ | ------------------------- | ---------------------- | ---- | ------------------ |
| Baden      | Wildwood                                       | `255628`           | `8522810`                 | `06.11.2026 14:40`     | `2`  | `7439`             |
| Baden      | Bibi Blocksberg - Die total verhexte Zeitreise | `255627`           | `8927952`                 | `06.11.2026 16:00`     | `1`  | `7366`             |
| St. Pölten | Triolino: Flöten-Flausen                       | `249785`           | `5945516`                 | `06.11.2026 14:00`     | `3`  | `7225`             |
| St. Pölten | Triolino: Flöten-Flausen                       | `249786`           | `5864578`                 | `06.11.2026 15:15`     | `3`  | `7225`             |

### Proposed route and uncertainties

Build a read-only GraphQL adapter if the operator permits this use. Parse the
German local timestamp explicitly and scope IDs by location. The frontend
queries include categories, status and film metadata; use those to distinguish
films from concerts/other events rather than treating every performance as a
film. The St. Pölten sample illustrates that classification requirement.

`cinative_id` is a verified field name with returned values, **not proof** that
an existing provider supports the backend. A booking hostname, performance
deep-link template, complete language/version mapping, API pagination/limits,
and long-term public API policy were not established. Do not construct ticket
URLs from these IDs without observing an actual official booking link. Also,
the API's date-string output has no explicit timezone offset.

## Follow-up before implementation

1. Compare the **actual Diesel payload** against the existing pmkino parser's
   accepted schema and backend assumptions; do not infer compatibility from
   the theme name. The live-directory check above found all 23 locations
   absent; recheck before onboarding if configuration has changed since then.
2. Ask operators for permitted feed/API access, rate limits and stable IDs.
   Publicly fetchable frontend data is not a promise of a supported partner API.
3. Establish fixtures for multiple locations, no-programme days, sold-out or
   hidden performances, OV/OmU/3D/Atmos labels, event-vs-film classification,
   booking URLs, and timezone/DST behavior. Raw counts above are discovery
   evidence, not fixture assertions or a coverage guarantee.
4. Recheck Cinema Paradiso's location-page failures and observe its official
   booking links before treating that candidate as integration-ready.

Method limitation: search-engine tooling was unavailable, so discovery used
the known official domains and links/assets returned by those sites directly.
This is a targeted four-operator investigation, not an exhaustive census of
Austrian exhibitors. No implementation or end-to-end booking was tested.

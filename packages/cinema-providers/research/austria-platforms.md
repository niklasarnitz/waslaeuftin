# Austrian cinema expansion: shared platforms and independents

Researched 2026-11-06 using anonymous, read-only requests to official websites and their public-facing programme APIs. This is a discovery report, not an implementation or permission to reuse data. See [operator research](./austria-operators.md) for chain-specific sources.

## Existing support and scope

The repository has a dedicated Cineplexx AT adapter and cinema-discovery script, plus generic Cinetixx, Cineprog, Kinoheld, CineOrder/Comtrada and other adapters. Sources: `src/index.ts`, `src/providers/cineplex-at/getCineplexxATMovies.ts`, and `apps/nextjs/scripts/create-cineplexx-at-cinemas.ts` (the latter path is relative to the repository root).

The existing [Cineplexx cinema endpoint](https://app.cineplexx.at/api/v1/cinemas) returned **29 records**. Its catalogue includes Actors Studio, Artis International, Annenhof Kino, URANIA CEENEMA, Geidorf Kunstkino, Stadtkino Villach and Filmtheater Kitzbühel, not just cinemas branded Cineplexx. These are not automatically new integration opportunities. The follow-up live-directory check at 12:17 Europe/Berlin on 2026-11-06 found 29 Austrian cinema entries, all from this catalogue, and **none of the 23 shortlisted operator locations**. See the [coverage check](./austria-operators.md#live-coverage-check-2026-11-06-1217-europeberlin) for method and limitations; direct database provider mappings and showing history were not accessible.

## Highest-leverage technical lead: Cineamo

The official [KINOLA website](https://www.kinolambach.at/) is powered by Cineamo. Its server-rendered Next.js payload contains cinema ID `1653`, showtime records, UTC start/end times, language and format flags, movie IDs, booking links, and self-links to `api.cineamo.com`.

Following those links and making anonymous GET requests confirmed:

| Endpoint                                                           | Observed result                                                                                                                  |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| [Austrian cinemas](https://api.cineamo.com/cinemas?countryCode=AT) | HTTP 200; 116 records across 12 pages. All 116 unique IDs had `countryCode: AT`. Follow `_links.next`; default page size was 10. |
| [KINOLA cinema](https://api.cineamo.com/cinemas/1653)              | HTTP 200; native ID, name, address and coordinates.                                                                              |
| [KINOLA programme](https://api.cineamo.com/showings?cinemaId=1653) | HTTP 200; 34 showings reported, four pages; first-page records all belonged to cinema 1653.                                      |
| [Individual showing](https://api.cineamo.com/showings/45747698)    | HTTP 200; title, native session ID, cinema ID, `startDatetime`, `movieId`, language/format flags and booking URL.                |
| [Movie details](https://api.cineamo.com/movies/1391337)            | HTTP 200; TMDB ID 1753205, IMDb ID tt46000907, original title and runtime 110 minutes for Rammstein – Live in Mexico City.       |

Anonymous programme checks for other operators also succeeded. Counts below are the API's reported totals at research time, **not verified complete schedules**:

| Cinema                       | Cineamo ID | Reported showings | Booking evidence from first result                                                              |
| ---------------------------- | ---------- | ----------------- | ----------------------------------------------------------------------------------------------- |
| Hollywood Megaplex Gasometer | 1442       | 388               | `https://www.megaplex.at/ticket/58889/490930`                                                   |
| Dieselkino Bruck             | 1444       | 90                | `https://kinoapi.dieselkino.at/?performanceId=988497d&cinemaNumber=07`                          |
| Cinema Paradiso Baden        | 1445       | 6                 | Cinema's film-detail page, not necessarily a session-specific checkout                          |
| Star Movie Regau             | 1481       | 160               | `https://www.starmovie.at/star-movie-regau/memberbereich/online-reservierung/?programId=163041` |
| Filmcasino                   | 1489       | 31                | `onlineTicketUrl` was null                                                                      |
| Burg Kino                    | 1439       | 17                | Programme records returned with UTC times                                                       |

Each row can be reproduced with `https://api.cineamo.com/showings?cinemaId=ID`; first-page cinema IDs matched the requested ID in each check. The catalogue also lists Votivkino/De France, Gartenbaukino, Leokino/Cinematograph, Moviemento/City-Kino, Schubert Kino, Programmkino Wels, CineCenter and many regional cinemas. Their individual schedule completeness was not established by their catalogue presence.

### Why this is promising

One adapter could cover several chains and many independents, rather than creating a scraper for every website. Stable cinema/session IDs, explicit UTC timestamps and movie identity evidence fit the repository's `ProviderCatalog`, `RawProviderMovie` and `RawProviderShowing` contracts well. Movie IDs can be null, so identity enrichment cannot be assumed for every record.

### Important limitations

- **116 is not the number of additional active cinemas.** Cineplexx records overlap existing support; seasonal, duplicate and potentially stale listings need filtering.
- Concrete duplicate/quality evidence: IDs `1465` (Star Movie Ried) and `1802` (STAR MOVIE Ried-Tumeltsham) both returned programmes, with different totals (18 and 142). ID `1447`, named Star Movie Liezen, had city `Linz`. Do not blindly create cities/cinemas from this catalogue.
- Many records identify their source as `showtime_collector`, rather than a direct cinema integration. KINOLA and Kino Freistadt identify `simevent`. That makes provenance, freshness and redistribution rights material questions.
- No documented third-party API contract, service guarantee or reuse licence was established. Anonymous HTTP access is **not** permission for bulk aggregation. Contact [Cineamo](https://www.cineamo.com/contact) about a supported feed and permitted use before production reliance.
- Cineamo's official [business website](https://b2b.cineamo.com) explicitly invites partnerships and offers cinema websites with automated programme promotion in its app. This is a credible contact route, not an advertised third-party data licence or API agreement.
- Follow every programme page, check date coverage and cancellations, retain provenance, and compare against official cinema schedules before enabling imports. The sampled first pages and reported totals do not prove completeness.
- Missing ticket URLs need a safe official programme fallback; never fabricate session checkout URLs. Avoid importing non-film events as ordinary movies.
- `/cinemas/1653/showings` returned 404; the observed working collection route is `/showings?cinemaId=1653`.

## Direct independent-cinema sources

### Filmcasino + Filmhaus, Vienna: practical two-cinema adapter

Both [Filmcasino](https://www.filmcasino.at/programm/) and [Filmhaus](https://www.filmhaus.at/programm/) publish the same combined, server-rendered programme. HTML includes titles, dates, times, distinct cinema labels, and native `data-show_id` attributes, e.g. show `9499934`, Filmcasino, Friday 6 November at 17:45. The page loads `https://cine.ntry.at/sdk/latest/ntry-sdk` and invokes `Ntry.openCinativeWidget`.

**Proposed route:** parse the public programme once, split by native venue, preserve show IDs, and link to the official film/programme page until stable deep links are verified. An Ntry/Cinative integration is a promising investigation, **not a demonstrated reusable programme API**. Do not scrape carts, orders, seats or session tokens.

### Votivkino + Kino De France, Vienna

The official [combined weekly programme](https://www.votivkino.at/programm/) exposes titles, directors, years, runtimes, venue, room, date/time, language version and event tags directly in HTML. Example: Alte Liebe, Andreas Dresen, 2026, 110 minutes, Kino De France, 6 November at 17:45, Saal 2, German original version.

**Proposed route:** a two-venue HTML programme adapter. Full-date extraction, stable session IDs and checkout links still need investigation; no compatibility with an existing adapter was proven.

### Gartenbaukino, Vienna

The [official programme overview](https://www.gartenbaukino.at/programm/programmuebersicht/) exposes titles, dates, times and ticket links such as `https://ticket.gartenbaukino.at/sinemacontrol/res_main.aspx?op=res&PrgID=20092`.

**Proposed route:** a venue-specific HTML adapter retaining `PrgID` where present. Exclude workshops/readings/non-film events; the programme includes these alongside screenings. Similar booking URL shapes elsewhere do not prove a shared programme API.

### DAS KINO, Salzburg

The [official programme](https://www.daskino.at/programm/) exposes film names, full dates, times, rooms, runtime, language and booking links to `https://ticket.daskino.at/WebTicketNet/Performance.aspx?oid=...`.

There were 145 JSON-LD `ScreeningEvent` objects, but the sampled first object had **no `startDate` or location**. This is not a complete structured showtime feed: an adapter would need to join the visible date/time/room HTML to the booking identifiers. Do not assume WebTicketNet is compatible with the existing CineOrder adapter merely because both use opaque OIDs.

### Moviemento + City-Kino, Linz

The [official Moviemento website](https://www.moviemento.at/) publishes programme HTML with ticket links to `reservierung.moviemento.at/seatselection/?show_id=...&location_id=...`. Observed location IDs included 4 and 6. The mapping from those IDs to venue names still needs verification.

**Proposed route:** inspect its programme structure and venue mapping before choosing an HTML or underlying feed adapter. KINOLA uses the same booking-path shape, but shared booking URLs alone do not establish shared programme-fetching compatibility.

## Discovery network, not yet a feed: nonstop

[nonstop's official cinema directory](https://nonstopkino.at/kinos/) is useful for expanding the shortlist across Vienna, Upper Austria, Styria, Carinthia, Lower Austria, Tyrol and Salzburg. Its [combined programme](https://nonstopkino.at/programm/) exposes cinema names, dates, times and language versions in HTML.

Do not equate directory membership with new coverage: Actors Studio, Geidorf Kunstkino, Stadtkino Villach and URANIA also appear in the existing Cineplexx discovery response. Seasonal/open-air venues are listed too. No supported redistribution API or permission was established for nonstop.

## Recommended next decision

1. **Best potential breadth:** ask Cineamo for a supported Austrian programme feed and permitted use; perform a read-only completeness and deduplication pilot before enabling any writes.
2. **Best independent direct-source pilot:** Filmcasino + Filmhaus, or Votivkino + De France: two venues each with programme HTML already verified.
3. **For chains without an aggregator dependency:** use the companion operator research to choose Star Movie, Hollywood Megaplex or Dieselkino, comparing direct programme quality and adapter cost.

No provider code, database records or deployment configuration was changed for this research. The inventory and counts are a dated snapshot, not a guarantee of present or future availability.

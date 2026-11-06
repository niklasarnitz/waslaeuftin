import { load } from "cheerio";
import xior from "xior";

import type {
  MovieIdentityEvidence,
  ProviderMovieWithShowings,
} from "@waslaeuftin/validators";
import { getCinemaItaliaTitleAliases } from "@waslaeuftin/cinema-providers/internal/providers/kino-ticket-express/getCinemaItaliaTitleAliases";

export async function getKinemathekIdentityDetails(
  movies: ProviderMovieWithShowings[],
) {
  const details = new Map<
    string,
    { evidence: MovieIdentityEvidence; url: string }
  >();
  if (!movies.length) return details;
  const request = xior.create({ timeout: 15_000 });
  const origin = "https://kinemathek-karlsruhe.de";
  const normalize = (value: string) =>
    value.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
  const titlesFor = (title: string) => [
    normalize(title),
    normalize(title.split(/\s+[-–—]\s+/)[0] ?? title),
  ];
  let festivalAliases:
    ReturnType<typeof getCinemaItaliaTitleAliases> | undefined;
  const slugs = new Set(
    movies
      .filter((movie) => movie.providerFilmId)
      .flatMap((movie) => titlesFor(movie.name))
      .map((title) =>
        title
          .replace(/ä/g, "ae")
          .replace(/ö/g, "oe")
          .replace(/ü/g, "ue")
          .replace(/ß/g, "ss")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
      ),
  );
  try {
    const index = load((await request.get<string>(`${origin}/`)).data);
    // Only follow published film links; a slug discovers a page, not identity.
    const urls = [
      ...new Set(
        index("a[href]")
          .toArray()
          .flatMap((link) => {
            const url = new URL(index(link).attr("href")!, origin);
            return url.origin === origin &&
              /^\/films\/[^/]+$/.test(url.pathname) &&
              !url.search &&
              !url.hash &&
              slugs.has(url.pathname.slice(7))
              ? [url.href]
              : [];
          }),
      ),
    ];
    for (let offset = 0; offset < urls.length; offset += 4) {
      await Promise.all(
        urls.slice(offset, offset + 4).map(async (url) => {
          try {
            const $ = load((await request.get<string>(url)).data);
            const page = $("article.film-page");
            if (page.length !== 1 || page.find(".fp-title").length !== 1)
              return;
            const title = page.find(".fp-title").text();
            const bookings = new Set(
              page
                .find(".fp-shows .show-row .sr-actions a[href]")
                .toArray()
                .map((link) => $(link).attr("href")),
            );
            // Kinemathek's credit line is director, country/year; runtime.
            // Unrecognized credit formats are not guessed from the synopsis.
            const credits =
              /^(.+),\s*[A-Z]{2,3}(?:\/[A-Z]{2,3})*\s+((?:18|19|20)\d{2});\s*(\d+)[′']$/.exec(
                page.find(".fp-credits").text().trim(),
              );
            const director = credits?.[1]?.trim();
            const originals = [
              ...new Set(
                page
                  .find(".fp-facts > span")
                  .toArray()
                  .flatMap((span) => {
                    const original = /^Originaltitel:\s*(.+)$/
                      .exec($(span).text().trim())?.[1]
                      ?.trim();
                    return original ? [original] : [];
                  }),
              ),
            ];
            const youtubeTrailerIds = new Set<string>();
            for (const link of page.find(".fp-trailer a[href]").toArray()) {
              try {
                const trailer = new URL($(link).attr("href")!);
                const id = trailer.searchParams.get("v");
                if (
                  trailer.protocol === "https:" &&
                  ["www.youtube.com", "youtube.com"].includes(trailer.host) &&
                  trailer.pathname === "/watch" &&
                  id &&
                  /^[\w-]{11}$/.test(id)
                )
                  youtubeTrailerIds.add(id);
              } catch {
                // Malformed optional trailer links do not invalidate credits.
              }
            }
            const evidence: MovieIdentityEvidence = {
              ...(director ? { director } : {}),
              ...(originals.length === 1
                ? { originalTitle: originals[0] }
                : {}),
              ...(youtubeTrailerIds.size
                ? { youtubeTrailerIds: [...youtubeTrailerIds] }
                : {}),
            };
            if (!Object.keys(evidence).length) return;
            for (const movie of movies) {
              if (
                movie.providerFilmId &&
                // A published page may omit the ticket listing's translation.
                // The exact booking URL must still bind it to this film.
                titlesFor(movie.name).includes(normalize(title)) &&
                movie.showings.some((showing) =>
                  bookings.has(showing.bookingUrl),
                )
              ) {
                let officialTitleAliases: MovieIdentityEvidence["officialTitleAliases"];
                if (
                  credits &&
                  normalize(movie.name) !== normalize(title) &&
                  page
                    .find(".fp-series a[href]")
                    .toArray()
                    .some(
                      (link) =>
                        new URL($(link).attr("href")!, origin).href ===
                        `${origin}/festivals/cinema-italia`,
                    )
                ) {
                  const aliases = await (festivalAliases ??=
                    getCinemaItaliaTitleAliases(
                      movies.map((movie) => movie.name),
                    ));
                  const verified = aliases.filter(
                    (alias) =>
                      normalize(alias.title) === normalize(movie.name) &&
                      normalize(alias.originalTitle) === normalize(title) &&
                      normalize(alias.director) === normalize(director!) &&
                      alias.productionYear === Number(credits[2]) &&
                      Math.abs(alias.runtimeMinutes - Number(credits[3])) <=
                        5 &&
                      (!movie.evidence?.productionYear ||
                        movie.evidence.productionYear ===
                          alias.productionYear) &&
                      (!movie.evidence?.runtimeMinutes ||
                        Math.abs(
                          movie.evidence.runtimeMinutes - alias.runtimeMinutes,
                        ) <= 5),
                  );
                  if (verified.length === 1) officialTitleAliases = verified;
                }
                details.set(movie.providerFilmId, {
                  evidence: {
                    ...evidence,
                    ...(officialTitleAliases
                      ? {
                          originalTitle:
                            evidence.originalTitle ??
                            officialTitleAliases[0]!.originalTitle,
                          officialTitleAliases,
                        }
                      : {}),
                  },
                  url,
                });
              }
            }
          } catch {
            // Optional film details must not discard the ticket catalog.
          }
        }),
      );
    }
  } catch {
    // An unavailable programme leaves the original evidence intact.
  }
  return details;
}

import { load } from "cheerio";
import xior from "xior";

import type {
  MovieIdentityEvidence,
  ProviderMovieWithShowings,
} from "@waslaeuftin/validators";

export async function getSchauburgIdentityDetails(
  movies: ProviderMovieWithShowings[],
) {
  const details = new Map<
    string,
    { evidence: MovieIdentityEvidence; url: string }
  >();
  if (!movies.length) return details;
  const request = xior.create({ timeout: 15_000 });
  const origin = "https://www.schauburg.de";
  const normalize = (value: string) =>
    value.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
  // Slugs discover existing pages only. Title and booking checks below bind
  // their evidence to a provider record, never the guessed slug itself.
  const slugFor = (value: string) =>
    normalize(value)
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  try {
    const index = load(
      (await request.get<string>(`${origin}/sitemap.xml`)).data,
      { xml: true },
    );
    const pageUrls = index("sitemap > loc")
      .toArray()
      .map((loc) => index(loc).text())
      .filter((value) => {
        const url = new URL(value);
        return url.origin === origin && url.pathname === "/sitemap.xml";
      });
    const sitemaps = [
      index,
      ...(await Promise.all(
        pageUrls.map(async (url) => {
          try {
            return load((await request.get<string>(url)).data, { xml: true });
          } catch {
            return load("", { xml: true });
          }
        }),
      )),
    ];
    const urls = [
      ...new Set(
        sitemaps.flatMap(($) =>
          $("url > loc")
            .toArray()
            .map((loc) => $(loc).text()),
        ),
      ),
    ].filter((value) => {
      const url = new URL(value);
      return (
        url.origin === origin &&
        /^\/film\/[^/]+$/.test(url.pathname) &&
        !url.search &&
        !url.hash &&
        movies.some(
          (movie) =>
            movie.providerFilmId &&
            slugFor(movie.name) === url.pathname.slice(6),
        )
      );
    });
    for (let offset = 0; offset < urls.length; offset += 4) {
      await Promise.all(
        urls.slice(offset, offset + 4).map(async (url) => {
          try {
            const $ = load((await request.get<string>(url)).data);
            const title = $("title")
              .text()
              .replace(/: Schauburg - Das Filmtheater in Karlsruhe\s*$/, "");
            const bookings = new Set(
              $(".schauburg-filmdetail-timeelement-link[href]")
                .toArray()
                .map((link) => $(link).attr("href")),
            );
            const directors = [
              ...new Set(
                $(".schauburg-filmdetail-poster-topic")
                  .toArray()
                  .filter((label) => $(label).text().trim() === "Regie")
                  .map((label) =>
                    $(label)
                      .next(".schauburg-filmdetail-poster-topic-text")
                      .text()
                      .trim(),
                  )
                  .filter(Boolean),
              ),
            ];
            const originals = [
              ...new Set(
                [
                  ...$("main .about p")
                    .text()
                    .matchAll(/[„“"]([^„“”"]+)[“”"]\s*\(Originaltitel\)/g),
                ]
                  .map((match) => match[1]!.trim())
                  .filter(Boolean),
              ),
            ];
            const youtubeTrailerIds = new Set<string>();
            for (const element of $(
              ".media2click-iframedata[data-attributes]",
            ).toArray()) {
              try {
                const attributes = JSON.parse(
                  $(element).attr("data-attributes")!,
                ) as { src?: unknown };
                if (typeof attributes.src !== "string") continue;
                const trailer = new URL(attributes.src);
                if (
                  trailer.protocol === "https:" &&
                  ["www.youtube.com", "www.youtube-nocookie.com"].includes(
                    trailer.hostname,
                  ) &&
                  /^\/embed\/[\w-]{11}$/.test(trailer.pathname)
                )
                  youtubeTrailerIds.add(trailer.pathname.slice(7));
              } catch {
                // Optional embedded media must not discard film credits.
              }
            }
            const evidence = {
              ...(directors.length === 1 ? { director: directors[0] } : {}),
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
                normalize(movie.name) === normalize(title) &&
                movie.showings.some((showing) =>
                  bookings.has(showing.bookingUrl),
                )
              )
                details.set(movie.providerFilmId, { evidence, url });
            }
          } catch {
            // Optional detail enrichment must not discard the ticket catalog.
          }
        }),
      );
    }
  } catch {
    // An unavailable or malformed sitemap leaves the original evidence intact.
  }
  return details;
}

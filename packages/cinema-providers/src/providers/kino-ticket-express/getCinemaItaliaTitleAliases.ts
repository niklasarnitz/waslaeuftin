import { load } from "cheerio";
import xior from "xior";

import type { MovieIdentityEvidence } from "@waslaeuftin/validators";

/** Read titles published for the Kinemathek's own stop of the official tour. */
export async function getCinemaItaliaTitleAliases(titles: string[]) {
  const aliases: NonNullable<MovieIdentityEvidence["officialTitleAliases"]> =
    [];
  const origin = "https://www.cinema-italia.net";
  const request = xior.create({ timeout: 15_000 });
  const normalize = (value: string) =>
    value.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
  try {
    const home = load((await request.get<string>(`${origin}/`)).data);
    const cities = [
      ...new Set(
        home(".navicites a[href]")
          .toArray()
          .flatMap((link) => {
            const url = new URL(home(link).attr("href")!, origin);
            return /\bKarlsruhe$/.test(home(link).text().trim()) &&
              url.origin === origin &&
              url.pathname === "/index.php" &&
              /^\d+$/.test(url.searchParams.get("selectedday") ?? "") &&
              !url.hash
              ? [url.href]
              : [];
          }),
      ),
    ];
    if (cities.length !== 1) return aliases;
    const city = load((await request.get<string>(cities[0]!)).data);
    if (
      city("h2").length !== 1 ||
      normalize(city("h2").text()) !== "kinemathek karlsruhe"
    )
      return aliases;
    const links = city("p.movie a[href]")
      .toArray()
      .filter((link) =>
        titles.some(
          (title) => normalize(title) === normalize(city(link).text()),
        ),
      )
      .slice(0, 7);
    for (const link of links) {
      const url = new URL(city(link).attr("href")!, origin);
      if (
        url.origin !== origin ||
        url.pathname !== "/filme.php" ||
        url.hash ||
        !/^\d+$/.test(url.searchParams.get("selectedfilm") ?? "")
      )
        continue;
      const film = load((await request.get<string>(url.href)).data);
      if (film("h1.red").length !== 1 || film("h2.red").length !== 1) continue;
      const originalTitle = film("h1.red").text().trim();
      const title = `${originalTitle} - ${film("h2.red").text().trim()}`;
      if (normalize(title) !== normalize(city(link).text())) continue;
      const directors = film("p > strong")
        .toArray()
        .filter((label) =>
          /^(?:Buch und )?Regie$/.test(film(label).text().trim()),
        );
      const facts = film("p > span.red > strong");
      if (directors.length !== 1 || facts.length !== 1) continue;
      const director = directors[0]!.nextSibling
        ? film(directors[0]!.nextSibling).text().replace(/^:\s*/, "").trim()
        : "";
      facts.closest("p").find("br").replaceWith(" ");
      const productionYear = Number(
        /\b((?:18|19|20)\d{2})\b/.exec(facts.text())?.[1],
      );
      const runtimeMinutes = Number(
        /\b(\d+)\s*Min\./.exec(facts.closest("p").text())?.[1],
      );
      if (!director || !productionYear || !runtimeMinutes) continue;
      aliases.push({
        title: city(link).text().trim(),
        originalTitle,
        director,
        productionYear,
        runtimeMinutes,
        sourceUrl: url.href,
      });
    }
  } catch {
    // Optional official catalog evidence must not discard the cinema catalog.
  }
  return aliases;
}

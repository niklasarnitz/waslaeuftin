import moment from "moment-timezone";

import type { ProviderCatalog } from "@waslaeuftin/cinema-providers/internal/ProviderCatalog";
import { fetchProgramme } from "@waslaeuftin/cinema-providers/internal/providers/comtrada/cineorder/publicProgramme";

const TIMEZONE = "Europe/Berlin";

export const getKinopolisCatalog = async (
  cinemaId: number,
  baseUrl: string,
  centerId: string,
): Promise<ProviderCatalog> => {
  const catalog: ProviderCatalog = { movies: [], showings: [] };
  const filmUrls = new Set<string>();

  // The weekly overview omits later advance screenings. Film-detail pages
  // contain all dates; discover them through both programme and presale lists.
  for (const listing of ["programm", "vorverkauf"]) {
    const $ = await fetchProgramme(`${baseUrl}/${listing}`);
    const actualCenter = /\bcenterid\s*=\s*['"]([^'"]+)['"]/.exec(
      $("script").text(),
    )?.[1];
    if (actualCenter !== centerId) {
      throw new Error(
        `Public programme belongs to a different cinema: ${baseUrl}`,
      );
    }
    $("a[href*='/filmdetail/']").each((_, link) => {
      const url = new URL($(link).attr("href")!, baseUrl);
      if (url.href.startsWith(`${baseUrl}/filmdetail/`)) filmUrls.add(url.href);
    });
  }
  if (filmUrls.size === 0)
    throw new Error(`No programme films found at ${baseUrl}`);

  const seen = new Set<string>();
  for (const filmUrl of filmUrls) {
    const $ = await fetchProgramme(filmUrl);
    const today = moment.tz(
      $("body").attr("data-x-date")?.slice(0, 10) ?? "",
      "YYYY-MM-DD",
      true,
      TIMEZONE,
    );
    if (!today.isValid())
      throw new Error(`Missing programme date at ${filmUrl}`);
    const heading = $("h1").first().clone();
    const originalTitle = heading.find(".hl--sub").text().trim() || undefined;
    heading.find(".hl--sub").remove();
    const name = heading
      .text()
      .replace(/\s+/g, " ")
      .replace(/\s*\/\s*$/, "")
      .trim();
    const providerFilmId = new URL(filmUrl).pathname.split("/").at(-1)!;
    if (!name) throw new Error(`Missing film title at ${filmUrl}`);
    const specs = new Map<string, string>();
    $(".movie__specs-el").each((_, element) => {
      const spec = $(element).clone();
      const key = spec.find(".movie__specs-title").text().trim();
      spec.find(".movie__specs-title").remove();
      specs.set(key, spec.text().trim());
    });
    const year = Number(specs.get("Produktionsjahr:"));
    const runtime = Number.parseInt(specs.get("Dauer:") ?? "", 10);
    const movie = {
      cinemaId,
      name,
      provider: "ComtradaCineOrder",
      providerFilmId,
      evidence: {
        originalTitle,
        productionYear: year >= 1800 && year <= 2100 ? year : undefined,
        runtimeMinutes: runtime > 0 ? runtime : undefined,
      },
    };
    catalog.movies.push(movie);

    const datesById = new Map<string, string>();
    $("[data-performance-ids]").each((_, element) => {
      const label = $(element).find(".prog-nav__day").text().trim();
      let day = today.clone();
      if (label === "Morgen") day.add(1, "day");
      else if (label !== "Heute") {
        const date = /\b(\d{2}\.\d{2}\.)/.exec(label)?.[1];
        if (!date)
          throw new Error(`Invalid screening date '${label}' at ${filmUrl}`);
        // Pick the year before parsing: next February 29 may be valid even
        // when the current year is not a leap year.
        const monthDay = date.slice(3, 5) + date.slice(0, 2);
        const year = today.year() + Number(monthDay < today.format("MMDD"));
        day = moment.tz(`${date}${year}`, "DD.MM.YYYY", true, TIMEZONE);
      }
      if (!day.isValid())
        throw new Error(`Invalid screening date at ${filmUrl}`);
      const ids = $(element)
        .attr("data-performance-ids")!
        .replace(/[[\]\s"]/g, "")
        .split(",");
      for (const id of ids) datesById.set(id, day.format("YYYY-MM-DD"));
    });

    $("[data-performance-id]").each((_, element) => {
      const id = $(element).attr("data-performance-id")!;
      if (seen.has(id)) return;
      seen.add(id);
      const showing = $(element);
      const link = showing.find(".prog2__time").first();
      const time = /\b\d{2}:\d{2}\b/.exec(link.text())?.[0];
      const day = datesById.get(id);
      const href = link.attr("href");
      const date = moment.tz(
        `${day} ${time}`,
        "YYYY-MM-DD HH:mm",
        true,
        TIMEZONE,
      );
      if (!day || !time || !date.isValid())
        throw new Error(`Invalid screening ${id} at ${filmUrl}`);
      catalog.showings.push({
        cinemaId,
        movieName: movie.name,
        provider: movie.provider,
        providerFilmId: movie.providerFilmId,
        providerSessionId: id,
        evidence: movie.evidence,
        dateTime: date.toDate(),
        // Expired performances have no buy link; retain their public film page.
        bookingUrl: href ? new URL(href, filmUrl).href : filmUrl,
        showingAdditionalData: [
          showing.find(".prog2__hall-num").text().trim(),
          ...showing
            .find(".prog2__tech .tech__icon")
            .toArray()
            .map(
              (icon) =>
                $(icon).text().trim() ||
                $(icon)
                  .attr("class")
                  ?.split(/\s+/)
                  .find(
                    (name) =>
                      name.startsWith("tech__") && name !== "tech__icon",
                  )
                  ?.slice("tech__".length)
                  .toUpperCase() ||
                "",
            ),
        ].filter(Boolean),
      });
    });
  }
  if (catalog.showings.length === 0)
    throw new Error(`No programme screenings found at ${baseUrl}`);
  return catalog;
};

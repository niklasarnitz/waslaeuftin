import moment from "moment-timezone";

import type { ProviderCatalog } from "@waslaeuftin/cinema-providers/internal/ProviderCatalog";
import {
  fetchProgramme,
  readProgrammeData,
} from "@waslaeuftin/cinema-providers/internal/providers/comtrada/cineorder/publicProgramme";

const PRESENTATION_FLAGS = {
  VierK: "4K",
  HFR: "HFR",
  HFRDreiD: "HFR 3D",
  Dolby: "Dolby",
  DolbySiebenEins: "Dolby 7.1",
  DolbyAtmos: "Dolby Atmos",
  OrigVersion: "OV",
  OmitU: "OmU",
  GretaStarks: "Greta & Starks",
};

type Screening = {
  datum: string;
  zeit: string;
  saal_bezeichnung?: string | Record<string, never>;
  link_desktop?: string;
  link_mobile?: string;
};

type ProgrammeScreenings = {
  vorstellungen_fakten?: Record<string, unknown>;
  termine: Record<string, Screening | Screening[]>;
};

type ProgrammeFilm = {
  filmfakten: {
    idf: string;
    titel: string;
    director?: string | Record<string, never>;
    laufzeit?: string | Record<string, never>;
    Versionsmarker?: string | Record<string, never>;
  };
  vorstellungen: ProgrammeScreenings | ProgrammeScreenings[];
};

export const getCineprogCatalog = async (
  cinemaId: number,
  baseUrl: string,
  centerId: string,
): Promise<ProviderCatalog> => {
  const $ = await fetchProgramme(`${baseUrl}/programm?filter=all`);
  const data = readProgrammeData<{ filme: Record<string, ProgrammeFilm> }>(
    $,
    "programm",
  );
  const source = new URL(baseUrl).hostname;
  const bookingHost = `iframe.cineorder.${source.replace(/^www\./, "")}`;
  const namespace =
    source === "www.kinocentergernsbach.de" ? "gernsbach" : source;
  const catalog: ProviderCatalog = { movies: [], showings: [] };
  const seen = new Set<string>();
  for (const record of Object.values(data.filme)) {
    const film = record.filmfakten;
    if (!film.idf || !film.titel?.trim())
      throw new Error(`Invalid programme film at ${baseUrl}`);
    const movie = {
      cinemaId,
      name: film.titel,
      provider: "ComtradaCineOrder",
      // The public programme's stable ID is not the old CineOrder film ID.
      providerFilmId: `${namespace}:${film.idf}`,
      evidence: {
        director: typeof film.director === "string" ? film.director : undefined,
        runtimeMinutes:
          typeof film.laufzeit === "string" && Number(film.laufzeit) > 0
            ? Number(film.laufzeit)
            : undefined,
      },
    };
    catalog.movies.push(movie);
    const versions = Array.isArray(record.vorstellungen)
      ? record.vorstellungen
      : [record.vorstellungen];
    for (const version of versions) {
      for (const day of Object.values(version.termine)) {
        for (const screening of Array.isArray(day) ? day : [day]) {
          const href = screening.link_desktop || screening.link_mobile;
          const date = moment.tz(
            `${screening.datum} ${screening.zeit}`,
            "YYYY-MM-DD HH:mm",
            true,
            "Europe/Berlin",
          );
          if (!href || !date.isValid())
            throw new Error(`Invalid screening for ${film.idf} at ${baseUrl}`);
          const bookingUrl = new URL(href);
          if (
            bookingUrl.protocol !== "https:" ||
            ![bookingHost, bookingHost.replace(/^iframe\./, "")].includes(
              bookingUrl.hostname,
            ) ||
            bookingUrl.searchParams.get("center") !== centerId
          ) {
            throw new Error(
              `Programme screening belongs to another cinema at ${baseUrl}`,
            );
          }
          const id = bookingUrl.searchParams.get("performance");
          if (!id)
            throw new Error(
              `Missing screening ID for ${film.idf} at ${baseUrl}`,
            );
          if (seen.has(id)) continue;
          seen.add(id);
          catalog.showings.push({
            cinemaId,
            movieName: movie.name,
            provider: movie.provider,
            providerFilmId: movie.providerFilmId,
            providerSessionId: id,
            evidence: movie.evidence,
            dateTime: date.toDate(),
            bookingUrl: bookingUrl.href,
            showingAdditionalData: [
              screening.saal_bezeichnung,
              version.vorstellungen_fakten?.DreiD === "1"
                ? "3D"
                : film.Versionsmarker,
              ...Object.entries(PRESENTATION_FLAGS)
                .filter(
                  ([flag]) => version.vorstellungen_fakten?.[flag] === "1",
                )
                .map(([, label]) => label),
            ].filter(
              (value): value is string =>
                typeof value === "string" && value.length > 0,
            ),
          });
        }
      }
    }
  }
  if (catalog.showings.length === 0)
    throw new Error(`No programme screenings found at ${baseUrl}`);
  return catalog;
};

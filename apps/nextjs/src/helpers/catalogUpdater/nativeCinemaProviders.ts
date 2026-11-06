import type { Cinema, Prisma } from "@waslaeuftin/db";
import {
  getCineprogMovies,
  getCinetixxMovies,
  getDieselKinoMovies,
  getMegaplexMovies,
  getStarMovieMovies,
  getUciMovies,
  getYorckMovies,
} from "@waslaeuftin/cinema-providers/server";

export const nativeProviderNames = [
  "Yorck",
  "Cinetixx",
  "Cineprog",
  "UCI",
  "DieselKino",
  "StarMovie",
  "Megaplex",
] as const;
export type NativeProviderName = (typeof nativeProviderNames)[number];

export const noNativeCinemaProvider = {
  yorckCinemaId: null,
  cinetixxCinemaId: null,
  cineprogBaseUrl: null,
  uciCinemaId: null,
  dieselKinoSlug: null,
  starMovieSlug: null,
  megaplexSlug: null,
} satisfies Prisma.CinemaWhereInput;

export const nativeProviderWhere = {
  Yorck: { yorckCinemaId: { not: null } },
  Cinetixx: { cinetixxCinemaId: { not: null } },
  Cineprog: { cineprogBaseUrl: { not: null } },
  UCI: { uciCinemaId: { not: null } },
  DieselKino: { dieselKinoSlug: { not: null } },
  StarMovie: { starMovieSlug: { not: null } },
  Megaplex: { megaplexSlug: { not: null } },
} satisfies Record<NativeProviderName, Prisma.CinemaWhereInput>;

export const nativeCinemaSourceKey = (
  cinema: Pick<
    Cinema,
    | "yorckCinemaId"
    | "yorckCinemaSlug"
    | "cinetixxCinemaId"
    | "cineprogBaseUrl"
    | "uciCinemaId"
    | "uciCinemaSlug"
    | "dieselKinoSlug"
    | "starMovieSlug"
    | "megaplexSlug"
  >,
) =>
  JSON.stringify([
    cinema.yorckCinemaId,
    cinema.yorckCinemaSlug,
    cinema.cinetixxCinemaId,
    cinema.cineprogBaseUrl,
    cinema.uciCinemaId,
    cinema.uciCinemaSlug,
    cinema.dieselKinoSlug,
    cinema.starMovieSlug,
    cinema.megaplexSlug,
  ]);

export const fetchNativeCinema = async (
  provider: NativeProviderName,
  cinema: Cinema,
) => {
  const catalog = await fetchConfiguredCinema(provider, cinema);
  catalog.cinemaSourceKeys = { [cinema.id]: nativeCinemaSourceKey(cinema) };
  return catalog;
};

const fetchConfiguredCinema = (
  provider: NativeProviderName,
  cinema: Cinema,
) => {
  switch (provider) {
    case "Yorck":
      if (!cinema.yorckCinemaId || !cinema.yorckCinemaSlug)
        throw new Error(`Incomplete Yorck mapping for cinema ${cinema.id}`);
      return getYorckMovies(cinema.id, {
        vistaId: cinema.yorckCinemaId,
        slug: cinema.yorckCinemaSlug,
      });
    case "Cinetixx":
      if (!cinema.cinetixxCinemaId)
        throw new Error(`Missing Cinetixx mapping for cinema ${cinema.id}`);
      return getCinetixxMovies(cinema.id, cinema.cinetixxCinemaId);
    case "Cineprog":
      if (!cinema.cineprogBaseUrl)
        throw new Error(`Missing Cineprog mapping for cinema ${cinema.id}`);
      return getCineprogMovies(cinema.id, cinema.cineprogBaseUrl);
    case "UCI":
      if (!cinema.uciCinemaId || !cinema.uciCinemaSlug)
        throw new Error(`Incomplete UCI mapping for cinema ${cinema.id}`);
      return getUciMovies(cinema.id, {
        siteId: cinema.uciCinemaId,
        slug: cinema.uciCinemaSlug,
      });
    case "DieselKino":
      if (!cinema.dieselKinoSlug || cinema.country !== "AUSTRIA")
        throw new Error(`Invalid Diesel Kino mapping for cinema ${cinema.id}`);
      return getDieselKinoMovies(cinema.id, cinema.dieselKinoSlug);
    case "StarMovie":
      if (!cinema.starMovieSlug || cinema.country !== "AUSTRIA")
        throw new Error(`Invalid Star Movie mapping for cinema ${cinema.id}`);
      return getStarMovieMovies(cinema.id, cinema.starMovieSlug);
    case "Megaplex":
      if (!cinema.megaplexSlug || cinema.country !== "AUSTRIA")
        throw new Error(`Invalid Megaplex mapping for cinema ${cinema.id}`);
      return getMegaplexMovies(cinema.id, cinema.megaplexSlug);
  }
};

import type { ProviderCatalog } from "@waslaeuftin/cinema-providers/server";
import type { Prisma } from "@waslaeuftin/db";
import type { resolveAndPersistCatalog } from "@waslaeuftin/helpers/catalogUpdater/resolveAndPersistCatalog";
import type {
  FetchProgressReporter,
  ProviderFetchOptions,
} from "@waslaeuftin/scripts/update-movies/helpers";
import { db } from "@waslaeuftin/db/client";
import { persistCinemaxxVueCatalog } from "@waslaeuftin/helpers/catalogUpdater/persistCinemaxxVueCatalog";
import { fetchCinemaxxVueCatalog } from "@waslaeuftin/scripts/update-movies/fetchCinemaxxVueCatalog";
import { fetchCineplexCatalog } from "@waslaeuftin/scripts/update-movies/fetchCineplexCatalog";
import { fetchCineplexxATCatalog } from "@waslaeuftin/scripts/update-movies/fetchCineplexxATMovies";
import { fetchCineStarCatalog } from "@waslaeuftin/scripts/update-movies/fetchCineStarCatalog";
import { fetchCinfinityCatalog } from "@waslaeuftin/scripts/update-movies/fetchCinfinityCatalog";
import { fetchComtradaCineOrderCatalog } from "@waslaeuftin/scripts/update-movies/fetchComtradaCineOrderCatalog";
import { fetchKinoHeldCatalog } from "@waslaeuftin/scripts/update-movies/fetchKinoHeldCatalog";
import { fetchKinoTicketsExpressCatalog } from "@waslaeuftin/scripts/update-movies/fetchKinoTicketsExpressCatalog";
import { fetchPremiumKinoCatalog } from "@waslaeuftin/scripts/update-movies/fetchPremiumKinoCatalog";

export type ProviderFetcher = {
  name: string;
  fetch: (
    progress?: FetchProgressReporter,
    options?: ProviderFetchOptions,
  ) => Promise<ProviderCatalog>;
  /** Selects the cinemas this provider fetches showings for. */
  cinemaWhere: Prisma.CinemaWhereInput;
  persist?: typeof resolveAndPersistCatalog;
};

export const providerFetchers: ProviderFetcher[] = [
  {
    name: "CinemaxxVue",
    fetch: fetchCinemaxxVueCatalog,
    cinemaWhere: { cinemaxxVueCinemasMetadataId: { not: null } },
    persist: async (catalogs, progress) => {
      const ids = [
        ...new Set(
          catalogs.flatMap((catalog) =>
            catalog.showings.map((showing) => showing.cinemaId),
          ),
        ),
      ];
      const cinemas = await db.cinema.findMany({
        where: { id: { in: ids } },
        include: { cinemaxxVueCinemasMetadata: true },
      });
      return persistCinemaxxVueCatalog(
        catalogs,
        cinemas.map((cinema) => {
          if (!cinema.cinemaxxVueCinemasMetadata)
            throw new Error(`Missing CinemaxX/Vue metadata for ${cinema.id}`);
          return {
            id: cinema.id,
            providerCinemaId: cinema.cinemaxxVueCinemasMetadata.cinemaId,
          };
        }),
        progress,
      );
    },
  },
  {
    name: "CineStar",
    fetch: fetchCineStarCatalog,
    cinemaWhere: { cineStarCinemaId: { not: null } },
  },
  {
    name: "Cinfinity",
    fetch: fetchCinfinityCatalog,
    cinemaWhere: { cinfinityCinemaId: { not: null } },
  },
  {
    name: "Cineplex",
    fetch: fetchCineplexCatalog,
    cinemaWhere: { cineplexCinemaId: { not: null } },
  },
  {
    name: "ComtradaCineOrder",
    fetch: fetchComtradaCineOrderCatalog,
    cinemaWhere: { comtradaCineOrderMetadataId: { not: null } },
  },
  {
    name: "KinoHeld",
    fetch: fetchKinoHeldCatalog,
    cinemaWhere: {
      kinoHeldCinemasMetadataId: { not: null },
      cinemaxxVueCinemasMetadataId: null,
    },
  },
  {
    name: "KinoTicketsExpress",
    fetch: fetchKinoTicketsExpressCatalog,
    cinemaWhere: { isKinoTicketsExpress: true },
  },
  {
    name: "PremiumKino",
    fetch: fetchPremiumKinoCatalog,
    cinemaWhere: { premiumKinoSubdomain: { not: null } },
  },
  {
    name: "CineplexxAT",
    fetch: fetchCineplexxATCatalog,
    cinemaWhere: { cineplexxAtCinemaId: { not: null } },
  },
];

export const providerNames = providerFetchers.map((provider) => provider.name);

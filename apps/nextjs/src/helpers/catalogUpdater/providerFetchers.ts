import type { ProviderCatalog } from "@waslaeuftin/cinema-providers/server";
import type { FetchProgressReporter } from "@waslaeuftin/scripts/update-movies/helpers";
import { fetchBoxofficeCatalog } from "@waslaeuftin/scripts/update-movies/fetchBoxofficeCatalog";
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
  fetch: (progress?: FetchProgressReporter) => Promise<ProviderCatalog>;
};

export const providerFetchers: ProviderFetcher[] = [
  { name: "CineStar", fetch: fetchCineStarCatalog },
  { name: "Cinfinity", fetch: fetchCinfinityCatalog },
  { name: "Cineplex", fetch: fetchCineplexCatalog },
  { name: "ComtradaCineOrder", fetch: fetchComtradaCineOrderCatalog },
  { name: "KinoHeld", fetch: fetchKinoHeldCatalog },
  { name: "KinoTicketsExpress", fetch: fetchKinoTicketsExpressCatalog },
  { name: "PremiumKino", fetch: fetchPremiumKinoCatalog },
  { name: "CineplexxAT", fetch: fetchCineplexxATCatalog },
  { name: "Boxoffice", fetch: fetchBoxofficeCatalog },
];

export const providerNames = providerFetchers.map((provider) => provider.name);

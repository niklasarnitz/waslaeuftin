import type { ProviderCatalog } from "@waslaeuftin/cinema-providers/server";
import type { NativeProviderName } from "@waslaeuftin/helpers/catalogUpdater/nativeCinemaProviders";
import type {
  FetchProgressReporter,
  ProviderFetchOptions,
} from "@waslaeuftin/scripts/update-movies/helpers";
import { db } from "@waslaeuftin/db/client";
import {
  fetchNativeCinema,
  nativeProviderWhere,
} from "@waslaeuftin/helpers/catalogUpdater/nativeCinemaProviders";
import { shouldFetchCinema } from "@waslaeuftin/scripts/update-movies/helpers";

export const fetchNativeCatalog = async (
  provider: NativeProviderName,
  progress?: FetchProgressReporter,
  options?: ProviderFetchOptions,
): Promise<ProviderCatalog> => {
  const cinemas = (
    await db.cinema.findMany({ where: nativeProviderWhere[provider] })
  ).filter((cinema) => shouldFetchCinema(cinema.lastFetchedAt, options));
  await progress?.onCinemasSelected(cinemas.length);
  const catalog: ProviderCatalog = {
    provider,
    fetchedCinemaIds: [],
    cinemaSourceKeys: {},
    movies: [],
    showings: [],
  };
  // Bound source traffic: detail-page providers already make multiple requests
  // per cinema. A failed venue aborts persistence for this provider batch.
  for (const cinema of cinemas) {
    try {
      const result = await fetchNativeCinema(provider, cinema);
      if (!result.showings.length || !result.movies.length)
        throw new Error("Empty native programme");
      if (
        result.showings.some(
          (showing) =>
            showing.cinemaId !== cinema.id || !showing.providerSessionId,
        )
      )
        throw new Error("Native programme has invalid cinema/session identity");
      catalog.movies.push(...result.movies);
      catalog.showings.push(...result.showings);
      catalog.fetchedCinemaIds?.push(cinema.id);
      Object.assign(catalog.cinemaSourceKeys!, result.cinemaSourceKeys);
      await progress?.onChunkProcessed(1, 0);
    } catch (error) {
      await progress?.onChunkProcessed(1, 1);
      throw new Error(
        `${provider} cinema ${cinema.id} (${cinema.name}) failed`,
        { cause: error },
      );
    }
  }
  return catalog;
};

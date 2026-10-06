import type { ProviderCatalog } from "@waslaeuftin/cinema-providers/server";
import type {
  FetchProgressReporter,
  ProviderFetchOptions,
} from "@waslaeuftin/scripts/update-movies/helpers";
import { createCinemaxxVueClient } from "@waslaeuftin/cinema-providers/server";
import { db } from "@waslaeuftin/db/client";
import {
  chunkArray,
  shouldFetchCinema,
} from "@waslaeuftin/scripts/update-movies/helpers";

export const fetchCinemaxxVueCatalog = async (
  progress?: FetchProgressReporter,
  options?: ProviderFetchOptions,
): Promise<ProviderCatalog> => {
  const cinemas = (
    await db.cinema.findMany({
      where: { cinemaxxVueCinemasMetadataId: { not: null } },
      include: { cinemaxxVueCinemasMetadata: true },
    })
  ).filter((cinema) => shouldFetchCinema(cinema.lastFetchedAt, options));
  const client = createCinemaxxVueClient();
  const catalog: ProviderCatalog = { movies: [], showings: [] };
  await progress?.onCinemasSelected(cinemas.length);
  console.info(`[CinemaxxVue] Fetching ${cinemas.length} cinemas`);
  for (const chunk of chunkArray(cinemas, 4)) {
    const results = await Promise.allSettled(
      chunk.map(async (cinema) => {
        const result = await client.getMovies(
          cinema.id,
          cinema.cinemaxxVueCinemasMetadata!.cinemaId,
        );
        if (!result.showings.length)
          throw new Error(`${cinema.name}: empty catalog`);
        return result;
      }),
    );
    await progress?.onChunkProcessed(
      chunk.length,
      results.filter((result) => result.status === "rejected").length,
    );
    for (const [index, result] of results.entries()) {
      if (result.status === "rejected") {
        throw new Error(
          `[CinemaxxVue] ${chunk[index]!.name}: ${String(result.reason)}`,
        );
      }
      catalog.movies.push(...result.value.movies);
      catalog.showings.push(...result.value.showings);
    }
  }
  // lastFetchedAt is updated by persistence, only after the schedule is saved.
  return catalog;
};

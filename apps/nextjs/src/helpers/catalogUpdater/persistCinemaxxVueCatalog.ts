import type { ProviderCatalog } from "@waslaeuftin/cinema-providers/server";
import type { ResolveProgressReporter } from "@waslaeuftin/helpers/catalogUpdater/resolveAndPersistCatalog";
import { db } from "@waslaeuftin/db/client";
import { resolveAndPersistCatalog } from "@waslaeuftin/helpers/catalogUpdater/resolveAndPersistCatalog";

export interface CinemaxxVueMapping {
  id: number;
  providerCinemaId: number;
}

// Resolve/enrich first, then replace showings and source mappings together.
// A failed fetch or resolve leaves the previous source and schedule intact.
export const persistCinemaxxVueCatalog = async (
  catalogs: ProviderCatalog[],
  mappings: CinemaxxVueMapping[],
  progress?: ResolveProgressReporter,
) => {
  const cinemaIds = mappings.map((mapping) => mapping.id);
  if (new Set(cinemaIds).size !== cinemaIds.length)
    throw new Error("Duplicate CinemaxX/Vue cinema mapping");
  for (const id of cinemaIds) {
    if (
      !catalogs.some((catalog) =>
        catalog.showings.some((showing) => showing.cinemaId === id),
      )
    ) {
      throw new Error(
        `Refusing to replace cinema ${id} with an empty CinemaxX/Vue catalog`,
      );
    }
  }
  return resolveAndPersistCatalog(catalogs, progress, async (showings) => {
    if (showings.some((showing) => !cinemaIds.includes(showing.cinemaId))) {
      throw new Error("CinemaxX/Vue catalog contains an unmapped cinema");
    }
    return db.$transaction(async (tx) => {
      await tx.showing.deleteMany({ where: { cinemaId: { in: cinemaIds } } });
      let count = 0;
      for (let offset = 0; offset < showings.length; offset += 1000) {
        const result = await tx.showing.createMany({
          data: showings.slice(offset, offset + 1000),
          skipDuplicates: true,
        });
        count += result.count;
      }
      for (const mapping of mappings) {
        await tx.cinema.update({
          where: { id: mapping.id },
          data: {
            kinoHeldCinemasMetadata: { disconnect: true },
            cinemaxxVueCinemasMetadata: {
              upsert: {
                create: { cinemaId: mapping.providerCinemaId },
                update: { cinemaId: mapping.providerCinemaId },
              },
            },
            lastFetchedAt: new Date(),
          },
        });
      }
      return count;
    });
  });
};

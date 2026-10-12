import type { ProviderCatalog } from "@waslaeuftin/cinema-providers/server";
import type { ResolveProgressReporter } from "@waslaeuftin/helpers/catalogUpdater/resolveAndPersistCatalog";
import { Prisma } from "@waslaeuftin/db";
import { db } from "@waslaeuftin/db/client";
import { resolveAndPersistCatalog } from "@waslaeuftin/helpers/catalogUpdater/resolveAndPersistCatalog";

export interface CinemaxxVueMapping {
  id: number;
  providerCinemaId: number;
}

// Resolve/enrich first, then refresh listings and source mappings together.
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
    if (showings.length === 0) return 0;
    // Match createMany's first-slot-wins policy. UPDATE ... FROM must have
    // exactly one source row per database slot, even across batch boundaries.
    const seenSlots = new Set<string>();
    const uniqueShowings = showings.filter((showing) => {
      const key = `${showing.cinemaId}:${showing.movieId}:${new Date(showing.dateTime).toISOString()}`;
      if (seenSlots.has(key)) return false;
      seenSlots.add(key);
      return true;
    });
    return db.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT "id" FROM "Cinema"
        WHERE "id" IN (${Prisma.join(cinemaIds)}) ORDER BY "id" FOR UPDATE
      `;
      // Withdraw missing future slots, but retain their IDs and source evidence.
      await tx.showing.updateMany({
        where: { cinemaId: { in: cinemaIds }, dateTime: { gte: new Date() } },
        data: { isListed: false },
      });
      let count = 0;
      for (let offset = 0; offset < uniqueShowings.length; offset += 1000) {
        const batch = uniqueShowings.slice(offset, offset + 1000);
        const result = await tx.showing.createMany({
          data: batch,
          skipDuplicates: true,
        });
        count += result.count;
        // Refresh exact slots in bulk, including ones that reappear. Thousands
        // of individual upserts would exceed the import transaction timeout.
        await tx.$executeRaw`
          UPDATE "Showing" AS s SET
            "isListed" = true,
            "rawMovieName" = incoming."rawMovieName",
            "bookingUrl" = incoming."bookingUrl",
            "showingAdditionalData" = incoming."showingAdditionalData",
            "sourceProvider" = incoming."sourceProvider",
            "providerFilmId" = incoming."providerFilmId",
            "sourceEvidence" = incoming."sourceEvidence",
            "matcherVersion" = incoming."matcherVersion",
            "matchEvaluatedAt" = incoming."matchEvaluatedAt",
            "matchEvaluation" = incoming."matchEvaluation",
            "updatedAt" = CURRENT_TIMESTAMP
          FROM jsonb_to_recordset(${JSON.stringify(batch)}::jsonb) AS incoming(
            "cinemaId" integer, "movieId" integer, "dateTime" timestamp(3),
            "rawMovieName" text, "bookingUrl" text, "showingAdditionalData" text[],
            "sourceProvider" text, "providerFilmId" text, "sourceEvidence" jsonb,
            "matcherVersion" integer, "matchEvaluatedAt" timestamp(3), "matchEvaluation" jsonb
          )
          WHERE s."cinemaId" = incoming."cinemaId"
            AND s."movieId" = incoming."movieId"
            AND s."dateTime" = incoming."dateTime"
        `;
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

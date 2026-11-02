import type { ProviderCatalog } from "@waslaeuftin/cinema-providers/server";
import type { ResolveProgressReporter } from "@waslaeuftin/helpers/catalogUpdater/resolveAndPersistCatalog";
import { Prisma } from "@waslaeuftin/db";
import { db } from "@waslaeuftin/db/client";
import { resolveAndPersistCatalog } from "@waslaeuftin/helpers/catalogUpdater/resolveAndPersistCatalog";

/** Replace fallback listings only after the complete direct programme resolves. */
export const persistComtradaCineOrderCatalog = async (
  catalogs: ProviderCatalog[],
  progress?: ResolveProgressReporter,
) => {
  const cinemaIds = [
    ...new Set(catalogs.flatMap((catalog) => catalog.fetchedCinemaIds ?? [])),
  ];
  if (
    catalogs.some((catalog) => catalog.provider !== "ComtradaCineOrder") ||
    catalogs.some((catalog) =>
      catalog.showings.some(
        (showing) =>
          showing.provider !== "ComtradaCineOrder" ||
          !showing.providerSessionId ||
          !cinemaIds.includes(showing.cinemaId),
      ),
    )
  )
    throw new Error("Invalid CineOrder refresh ownership");
  for (const id of cinemaIds) {
    if (
      !catalogs.some((catalog) =>
        catalog.showings.some((showing) => showing.cinemaId === id),
      )
    )
      throw new Error(`Refusing empty CineOrder refresh for cinema ${id}`);
  }
  const mappings = cinemaIds.length
    ? await db.cinema.findMany({
        where: {
          id: { in: cinemaIds },
          comtradaCineOrderMetadataId: { not: null },
        },
        select: { id: true, comtradaCineOrderMetadataId: true },
      })
    : [];
  if (mappings.length !== cinemaIds.length)
    throw new Error("CineOrder cinema mapping changed before persistence");
  return resolveAndPersistCatalog(catalogs, progress, async (showings) => {
    if (!cinemaIds.length) return 0;
    // Match createMany's first-slot-wins policy before the bulk UPDATE.
    const seen = new Set<string>();
    const unique = showings.filter((showing) => {
      const key = JSON.stringify([
        showing.cinemaId,
        showing.movieId,
        showing.dateTime,
        showing.providerSessionId,
      ]);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return db.$transaction(
      async (tx) => {
        await tx.$queryRaw`
        SELECT "id" FROM "Cinema" WHERE "id" IN (${Prisma.join(cinemaIds)})
        ORDER BY "id" FOR UPDATE
      `;
        if (
          (await tx.cinema.count({ where: { OR: mappings } })) !==
          cinemaIds.length
        )
          throw new Error("CineOrder cinema mapping changed during refresh");
        await tx.showing.updateMany({
          where: { cinemaId: { in: cinemaIds }, dateTime: { gte: new Date() } },
          data: { isListed: false },
        });
        let count = 0;
        for (let offset = 0; offset < unique.length; offset += 1000) {
          const batch = unique.slice(offset, offset + 1000);
          count += (
            await tx.showing.createMany({ data: batch, skipDuplicates: true })
          ).count;
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
            "providerSessionId" text,
            "matcherVersion" integer, "matchEvaluatedAt" timestamp(3), "matchEvaluation" jsonb
          )
          WHERE s."cinemaId" = incoming."cinemaId"
            AND s."movieId" = incoming."movieId"
            AND s."dateTime" = incoming."dateTime"
            AND s."providerSessionId" = incoming."providerSessionId"
        `;
        }
        await tx.cinema.updateMany({
          where: { id: { in: cinemaIds } },
          data: { lastFetchedAt: new Date() },
        });
        return count;
      },
      { timeout: 30_000 },
    );
  });
};

import type { ProviderCatalog } from "@waslaeuftin/cinema-providers/server";
import type { Cinema } from "@waslaeuftin/db";
import type { ResolveProgressReporter } from "@waslaeuftin/helpers/catalogUpdater/resolveAndPersistCatalog";
import { Prisma } from "@waslaeuftin/db";
import { db } from "@waslaeuftin/db/client";
import {
  nativeCinemaSourceKey,
  nativeProviderNames,
  nativeProviderWhere,
} from "@waslaeuftin/helpers/catalogUpdater/nativeCinemaProviders";
import { resolveAndPersistCatalog } from "@waslaeuftin/helpers/catalogUpdater/resolveAndPersistCatalog";

export type NativeCinemaMapping = Pick<
  Cinema,
  | "id"
  | "yorckCinemaId"
  | "yorckCinemaSlug"
  | "cinetixxCinemaId"
  | "cineprogBaseUrl"
  | "uciCinemaId"
  | "uciCinemaSlug"
  | "dieselKinoSlug"
  | "starMovieSlug"
  | "megaplexSlug"
> & { previousSourceKey: string };

// Movie resolution happens before the transaction. Listings, source metadata,
// onboarding mappings and freshness change together, or not at all.
export const persistNativeCatalog = async (
  catalogs: ProviderCatalog[],
  progress?: ResolveProgressReporter,
  mappings: NativeCinemaMapping[] = [],
) => {
  const provider = nativeProviderNames.find(
    (name) => name === catalogs[0]?.provider,
  );
  if (!provider || catalogs.some((catalog) => catalog.provider !== provider))
    throw new Error("Expected one native provider per refresh");
  const cinemaIds = [
    ...new Set(catalogs.flatMap((catalog) => catalog.fetchedCinemaIds ?? [])),
  ];
  if (
    !cinemaIds.length ||
    mappings.some((mapping) => !cinemaIds.includes(mapping.id))
  )
    throw new Error("Native refresh has no validated cinema mapping");
  const seenSessions = new Set<string>();
  for (const catalog of catalogs) {
    for (const showing of catalog.showings) {
      if (
        !cinemaIds.includes(showing.cinemaId) ||
        showing.provider !== provider ||
        !showing.providerSessionId
      )
        throw new Error("Native refresh contains an invalid source/session");
      const key = `${showing.cinemaId}:${showing.providerSessionId}`;
      if (seenSessions.has(key))
        throw new Error(`Duplicate native session ${key}`);
      seenSessions.add(key);
    }
  }
  for (const id of cinemaIds) {
    if (
      !catalogs.some((catalog) =>
        catalog.showings.some((showing) => showing.cinemaId === id),
      )
    )
      throw new Error(`Refusing empty native refresh for cinema ${id}`);
  }
  return resolveAndPersistCatalog(catalogs, progress, async (showings) => {
    return db.$transaction(
      async (tx) => {
        await tx.$queryRaw`
        SELECT "id" FROM "Cinema"
        WHERE "id" IN (${Prisma.join(cinemaIds)}) ORDER BY "id" FOR UPDATE
      `;
        for (const { id, previousSourceKey, ...data } of mappings) {
          const previous = await tx.cinema.findUniqueOrThrow({ where: { id } });
          if (nativeCinemaSourceKey(previous) !== previousSourceKey)
            throw new Error(
              "Native provider mapping changed before activation",
            );
          if (
            previous.cinemaxxVueCinemasMetadataId ||
            previous.cineStarCinemaId ||
            previous.cineplexCinemaId ||
            previous.cinfinityCinemaId ||
            previous.cineplexxAtCinemaId ||
            previous.isKinoTicketsExpress ||
            previous.premiumKinoSubdomain ||
            previous.comtradaCineOrderMetadataId
          )
            throw new Error(
              "Another direct provider was configured before activation",
            );
          await tx.cinema.update({ where: { id }, data });
        }
        const owned = await tx.cinema.findMany({
          where: { id: { in: cinemaIds }, ...nativeProviderWhere[provider] },
        });
        if (
          owned.length !== cinemaIds.length ||
          owned.some((cinema) => {
            const expected = catalogs
              .map((catalog) => catalog.cinemaSourceKeys?.[cinema.id])
              .filter(Boolean);
            return (
              !expected.length ||
              expected.some((key) => key !== nativeCinemaSourceKey(cinema))
            );
          })
        )
          throw new Error("Native provider mapping changed during refresh");
        await tx.showing.updateMany({
          where: { cinemaId: { in: cinemaIds }, dateTime: { gte: new Date() } },
          data: { isListed: false },
        });
        let count = 0;
        for (let offset = 0; offset < showings.length; offset += 1000) {
          const batch = showings.slice(offset, offset + 1000);
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
            "sourceMetadata" = incoming."sourceMetadata",
            "sourceEvidence" = incoming."sourceEvidence",
            "matcherVersion" = incoming."matcherVersion",
            "matchEvaluatedAt" = incoming."matchEvaluatedAt",
            "matchEvaluation" = incoming."matchEvaluation",
            "updatedAt" = CURRENT_TIMESTAMP
          FROM jsonb_to_recordset(${JSON.stringify(batch)}::jsonb) AS incoming(
            "cinemaId" integer, "movieId" integer, "dateTime" timestamp(3),
            "rawMovieName" text, "bookingUrl" text, "showingAdditionalData" text[],
            "sourceProvider" text, "providerFilmId" text, "providerSessionId" text,
            "sourceMetadata" jsonb, "sourceEvidence" jsonb, "matcherVersion" integer,
            "matchEvaluatedAt" timestamp(3), "matchEvaluation" jsonb
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

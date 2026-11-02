// Dry run by default. Run --apply only after the new readers are deployed.
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { additionalCineOrderSources } from "@waslaeuftin/cinema-providers/internal/providers/comtrada/cineorder/additionalSources";
import { getComtradaCineOrderMovies } from "@waslaeuftin/cinema-providers/server";
import { db } from "@waslaeuftin/db/client";
import { noNativeCinemaProvider } from "@waslaeuftin/helpers/catalogUpdater/nativeCinemaProviders";

if (process.argv.slice(2).some((arg) => arg !== "--apply"))
  throw new Error("Usage: configure-cineorder-cinemas.ts [--apply]");

try {
  const cinemas = await db.cinema.findMany({
    where: {
      OR: additionalCineOrderSources.map((source) => ({
        name: source.name,
        city: { name: source.city },
      })),
      ...noNativeCinemaProvider,
    },
    include: { city: true, comtradaCineOrderMetadata: true },
  });
  const plan: {
    cinema: (typeof cinemas)[number];
    mapping: Pick<
      (typeof additionalCineOrderSources)[number],
      "backendUrl" | "centerShorty" | "centerId"
    >;
  }[] = [];
  for (const source of additionalCineOrderSources) {
    const matches = cinemas.filter(
      (cinema) =>
        cinema.name === source.name && cinema.city.name === source.city,
    );
    if (matches.length !== 1)
      throw new Error(
        `Expected one existing cinema for ${source.name}, ${source.city}`,
      );
    const cinema = matches[0]!;
    if (
      cinema.cinemaxxVueCinemasMetadataId ||
      cinema.cineStarCinemaId ||
      cinema.cineplexCinemaId ||
      cinema.cineplexxAtCinemaId ||
      cinema.isKinoTicketsExpress ||
      cinema.premiumKinoSubdomain
    )
      throw new Error(
        `Another direct provider is configured for ${cinema.name}`,
      );
    const mapping = {
      backendUrl: source.backendUrl,
      centerShorty: source.centerShorty,
      centerId: source.centerId,
    };
    const existing = cinema.comtradaCineOrderMetadata;
    if (
      existing &&
      (existing.backendUrl !== mapping.backendUrl ||
        existing.centerShorty !== mapping.centerShorty ||
        existing.centerId !== mapping.centerId)
    )
      throw new Error(`Conflicting CineOrder mapping for ${cinema.name}`);
    const catalog = await getComtradaCineOrderMovies(cinema.id, {
      ...mapping,
      id: -1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    if (!catalog.showings.length)
      throw new Error(`No screenings for ${cinema.name}`);
    console.info(
      JSON.stringify({
        id: cinema.id,
        cinema: cinema.name,
        films: catalog.movies.length,
        screenings: catalog.showings.length,
        mapping,
      }),
    );
    plan.push({ cinema, mapping });
  }
  if (!process.argv.includes("--apply")) {
    console.info(
      "Dry run only. After deployment, --apply activates CineOrder for all 23 cinemas; Kinoheld/Cinfinity metadata is retained but excluded from fetching.",
    );
  } else {
    const backup = resolve(
      ".cache",
      `cineorder-mappings-before-${Date.now()}.json`,
    );
    await mkdir(resolve(".cache"), { recursive: true });
    await writeFile(backup, JSON.stringify(plan, null, 2), { mode: 0o600 });
    await db.$transaction(
      async (tx) => {
        await tx.$executeRaw`LOCK TABLE "ProviderUpdateRun" IN SHARE ROW EXCLUSIVE MODE`;
        if (
          await tx.providerUpdateRun.count({
            where: { status: { in: ["QUEUED", "RUNNING"] } },
          })
        )
          throw new Error(
            "Wait for provider updates to finish before switching sources",
          );
        for (const { cinema, mapping } of plan) {
          if (cinema.comtradaCineOrderMetadataId) continue;
          const metadata = await tx.comtradaCineOrderMetadata.create({
            data: mapping,
          });
          const updated = await tx.cinema.updateMany({
            where: {
              id: cinema.id,
              updatedAt: cinema.updatedAt,
              comtradaCineOrderMetadataId: null,
            },
            data: {
              comtradaCineOrderMetadataId: metadata.id,
              lastFetchedAt: null,
            },
          });
          if (updated.count !== 1)
            throw new Error(
              `Cinema ${cinema.id} changed during validation; rerun the dry run`,
            );
        }
      },
      { timeout: 30_000 },
    );
    console.info(
      `Activated CineOrder mappings. Previous mappings saved to ${backup}. Run the regular importer to refresh listings.`,
    );
  }
} finally {
  await db.$disconnect();
}

// Dry run: bun --env-file=.env apps/nextjs/scripts/migrate-cinemaxx-vue-cinemas.ts
// Apply: append --apply. Keeps cinema IDs/slugs and saves a rollback snapshot.
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { createCinemaxxVueClient } from "@waslaeuftin/cinema-providers/server";
import { db } from "@waslaeuftin/db/client";
import { matchCinemaxxVueCinema } from "@waslaeuftin/helpers/catalogUpdater/matchCinemaxxVueCinema";

try {
  const client = createCinemaxxVueClient();
  const directory = await client.getCinemas();
  const cinemas = await db.cinema.findMany({
    where: {
      country: "GERMANY",
      OR: [
        { name: { contains: "cinemaxx", mode: "insensitive" } },
        { name: { equals: "Holi-Kino", mode: "insensitive" } },
        { cinemaxxVueCinemasMetadataId: { not: null } },
      ],
    },
    include: { city: true, cinemaxxVueCinemasMetadata: true },
    orderBy: { id: "asc" },
  });
  const mappings = cinemas.map((cinema) => ({
    id: cinema.id,
    providerCinemaId: matchCinemaxxVueCinema(cinema, directory),
  }));
  for (const [index, mapping] of mappings.entries())
    console.info(
      `[CinemaxxVue] ${cinemas[index]!.name}: ${mapping.id} -> ${mapping.providerCinemaId}`,
    );
  const missing = directory.filter(
    (entry) =>
      !mappings.some(
        (mapping) => String(mapping.providerCinemaId) === entry.cinemaId,
      ),
  );
  console.info(
    `[CinemaxxVue] ${mappings.length} existing cinemas matched. Not in database: ${missing.map((entry) => entry.fullName).join(", ") || "none"}`,
  );
  if (!process.argv.includes("--apply")) {
    console.info(
      "Dry run only. Use --apply to fetch, validate and replace these sources and schedules.",
    );
  } else {
    const assertNoUpdates = async () => {
      const active = await db.providerUpdateRun.count({
        where: { status: { in: ["QUEUED", "RUNNING"] } },
      });
      if (active)
        throw new Error(
          "Wait for active provider updates to finish before migrating CinemaxX/Vue",
        );
    };
    await assertNoUpdates();
    const catalogs = [];
    for (const mapping of mappings) {
      const catalog = await client.getMovies(
        mapping.id,
        mapping.providerCinemaId,
      );
      if (!catalog.showings.length)
        throw new Error(
          `Empty direct catalog for cinema ${mapping.id}; migration cancelled`,
        );
      catalogs.push(catalog);
      console.info(
        `[CinemaxxVue] Validated ${mapping.id}: ${catalog.movies.length} movies, ${catalog.showings.length} showings`,
      );
    }
    await assertNoUpdates();
    const backup = resolve(".cache", `cinemaxx-vue-before-${Date.now()}.json`);
    await mkdir(resolve(".cache"), { recursive: true });
    await writeFile(
      backup,
      JSON.stringify(
        {
          cinemas,
          showings: await db.showing.findMany({
            where: { cinemaId: { in: mappings.map((mapping) => mapping.id) } },
          }),
        },
        null,
        2,
      ),
      { mode: 0o600 },
    );
    console.info(`[CinemaxxVue] Rollback snapshot: ${backup}`);
    const { persistCinemaxxVueCatalog } =
      await import("@waslaeuftin/helpers/catalogUpdater/persistCinemaxxVueCatalog");
    const result = await persistCinemaxxVueCatalog(catalogs, mappings);
    console.info(
      `[CinemaxxVue] Migrated ${mappings.length} cinemas and saved ${result.totalShowings} direct showings`,
    );
  }
} finally {
  await db.$disconnect();
}

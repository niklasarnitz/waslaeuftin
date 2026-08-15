import { db } from "@waslaeuftin/db/client";
import { fetchTmdbMovieDetails } from "@waslaeuftin/helpers/tmdb/fetchTmdbMovieDetails";
import { upsertTmdbMetadata } from "@waslaeuftin/helpers/fileStorage/upsertTmdbMetadata";

async function backfill() {
  console.log("=== STARTING TMDB METADATA BACKFILL ===");

  const allRecords = await db.tmdbMetadata.findMany({
    select: { tmdbId: true, title: true },
    orderBy: { tmdbId: "asc" },
  });

  console.log(`Found ${allRecords.length} total TMDB records to update...`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < allRecords.length; i++) {
    const record = allRecords[i]!;
    try {
      const details = await fetchTmdbMovieDetails(record.tmdbId);
      await upsertTmdbMetadata(details);
      successCount++;
      if ((i + 1) % 25 === 0 || i === allRecords.length - 1) {
        console.log(
          `Progress: ${i + 1}/${allRecords.length} (Success: ${successCount}, Errors: ${errorCount})`,
        );
      }
      // Small pause to respect TMDB rate limits
      await new Promise((r) => setTimeout(r, 50));
    } catch (err) {
      errorCount++;
      console.warn(
        `Failed to update TMDB ID ${record.tmdbId} (${record.title}):`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  console.log(
    `=== BACKFILL COMPLETED: ${successCount} updated, ${errorCount} failed ===`,
  );
  await db.$disconnect();
}

backfill().catch((err) => {
  console.error("Fatal backfill error:", err);
  process.exit(1);
});

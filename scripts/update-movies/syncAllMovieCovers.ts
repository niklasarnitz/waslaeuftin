import { db } from "@waslaeuftin/server/db";

import { syncTmdbMovieCoversForAllMovies } from "./syncTmdbMovieCovers";

const forceRefreshExistingCovers =
  process.argv.includes("--force") || process.argv.includes("--force-refresh");

try {
  const result = await syncTmdbMovieCoversForAllMovies({
    forceRefreshExistingCovers,
  });

  console.info(
    `[TMDB Cover Sync All] Finished: updated=${result.updatedMovies}, considered=${result.consideredMovies}, skippedExistingCover=${result.skippedExistingCover}, lowConfidence=${result.skippedLowConfidence}, noPoster=${result.skippedNoPoster}, noMatch=${result.skippedNoTmdbMatch}`,
  );
} finally {
  await db.$disconnect();
}

import { db } from "@waslaeuftin/db/client";
import { syncTmdbMovieCoversForAllMovies } from "@waslaeuftin/scripts/update-movies/syncTmdbMovieCovers";

console.info(
  "[Re-evaluate Unmatched] Starting bulk re-evaluation of unmatched movies...",
);

// Clear tmdbSearchFailedOn to allow fresh evaluation with updated normalization rules
const resetResult = await db.movie.updateMany({
  where: { tmdbMovieId: null },
  data: { tmdbSearchFailedOn: null },
});

console.info(
  `[Re-evaluate Unmatched] Reset search failure timestamp for ${resetResult.count} unmatched movies`,
);

try {
  const result = await syncTmdbMovieCoversForAllMovies({
    forceRefreshExistingCovers: false,
    unmatchedOnly: true,
  });

  console.info(
    `[Re-evaluate Unmatched] Finished: updated=${result.updatedMovies}, considered=${result.consideredMovies}, skippedExistingCover=${result.skippedExistingCover}, lowConfidence=${result.skippedLowConfidence}, noPoster=${result.skippedNoPoster}, noMatch=${result.skippedNoTmdbMatch}`,
  );
} finally {
  await db.$disconnect();
}

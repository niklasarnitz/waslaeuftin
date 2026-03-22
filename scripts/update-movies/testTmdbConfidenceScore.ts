import { db } from "@waslaeuftin/server/db";

import { evaluateMovieTitleAgainstTmdb } from "./syncTmdbMovieCovers";

const TARGET_CINEMAS = [
  "Filmpalast am ZKM",
  "Kinemathek Karlsruhe",
] as const;
const SAMPLE_SIZE_PER_CINEMA = 20;

try {
  for (const cinemaName of TARGET_CINEMAS) {
    const cinema = await db.cinema.findFirst({
      where: {
        name: cinemaName,
      },
      include: {
        movies: {
          orderBy: {
            name: "asc",
          },
          take: SAMPLE_SIZE_PER_CINEMA,
        },
      },
    });

    if (!cinema) {
      console.warn(`[TMDB Confidence Test] Cinema not found: ${cinemaName}`);
      continue;
    }

    console.info(
      `[TMDB Confidence Test] ${cinema.name}: evaluating ${cinema.movies.length} movies`,
    );

    const evaluations = await Promise.all(
      cinema.movies.map((movie) => evaluateMovieTitleAgainstTmdb(movie.name)),
    );

    let accepted = 0;
    let noMatch = 0;
    let lowConfidence = 0;
    let noPoster = 0;
    let totalConfidence = 0;

    for (const [index, evaluation] of evaluations.entries()) {
      const movie = cinema.movies[index];

      if (!movie) {
        continue;
      }

      const best = evaluation.bestCandidate;

      if (!best) {
        noMatch += 1;
        console.info(
          `  [NO_MATCH] "${movie.name}" -> no candidate returned by TMDB`,
        );
        continue;
      }

      totalConfidence += best.confidence;

      const status =
        best.confidence < evaluation.threshold
          ? "LOW_CONFIDENCE"
          : !best.posterPath
            ? "NO_POSTER"
            : "ACCEPTED";

      if (status === "ACCEPTED") {
        accepted += 1;
      } else if (status === "LOW_CONFIDENCE") {
        lowConfidence += 1;
      } else {
        noPoster += 1;
      }

      console.info(
        `  [${status}] "${movie.name}" -> "${best.title}" (${best.releaseDate ?? "n/a"}) score=${best.confidence.toFixed(3)} query="${best.sourceQuery}"`,
      );
    }

    const averageConfidence =
      evaluations.length > 0 ? totalConfidence / evaluations.length : 0;

    console.info(
      `[TMDB Confidence Test] ${cinema.name} summary: accepted=${accepted}, lowConfidence=${lowConfidence}, noPoster=${noPoster}, noMatch=${noMatch}, avgScore=${averageConfidence.toFixed(3)}`,
    );
  }
} finally {
  await db.$disconnect();
}

import { getCineStarMovies } from "@waslaeuftin/cinemaProviders/cinestar/getCineStarMovies";
import { db } from "@waslaeuftin/server/db";
import {
  BATCH_DELAY_MS,
  chunkArray,
  CINEMA_BATCH_SIZE,
  sleep,
} from "./helpers";

const failedCinemas: string[] = [];

try {
  const cinestarCinemas = await db.cinema.findMany({
    where: { cineStarCinemaId: { not: null } },
  });
  console.info(`[CineStar] Found ${cinestarCinemas.length} cinemas to update`);

  const cinemaChunks = chunkArray(cinestarCinemas, CINEMA_BATCH_SIZE);
  console.info(
    `[CineStar] Processing ${cinemaChunks.length} chunks with up to ${CINEMA_BATCH_SIZE} cinemas each`,
  );

  for (const [index, chunk] of cinemaChunks.entries()) {
    console.info(
      `[CineStar][Chunk ${index + 1}/${cinemaChunks.length}] Fetching provider data for ${chunk.length} cinemas`,
    );
    const cinemaResults = await Promise.allSettled(
      chunk.map((cinema) =>
        getCineStarMovies(cinema.id, cinema.cineStarCinemaId!),
      ),
    );

    const successfulCinemaIds: number[] = [];
    const successfulCinemaData: Awaited<
      ReturnType<typeof getCineStarMovies>
    >[] = [];

    for (const [resultIndex, result] of cinemaResults.entries()) {
      const cinema = chunk[resultIndex];

      if (!cinema) {
        continue;
      }

      if (result.status === "fulfilled") {
        successfulCinemaIds.push(cinema.id);
        successfulCinemaData.push(result.value);
      } else {
        const errorMessage =
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason);
        failedCinemas.push(`${cinema.id}:${cinema.name} (${errorMessage})`);
      }
    }

    console.info(
      `[CineStar][Chunk ${index + 1}/${cinemaChunks.length}] Fetch finished: ${successfulCinemaData.length} succeeded, ${failedCinemas.length} failed total`,
    );

    if (successfulCinemaData.length > 0) {
      const movies = successfulCinemaData.flatMap((data) => data.movies);
      const showings = successfulCinemaData.flatMap((data) =>
        data.showings.flat(),
      );

      console.info(
        `[CineStar][Chunk ${index + 1}/${cinemaChunks.length}] Writing ${movies.length} movies and ${showings.length} showings`,
      );

      await db.movie.deleteMany({
        where: {
          cinemaId: {
            in: successfulCinemaIds,
          },
        },
      });
      await db.movie.createMany({ data: movies, skipDuplicates: true });
      await db.showing.createMany({
        data: showings,
      });
      console.info(
        `[CineStar][Chunk ${index + 1}/${cinemaChunks.length}] Write finished`,
      );
    }

    if (index < cinemaChunks.length - 1) {
      console.info(
        `[CineStar][Chunk ${index + 1}/${cinemaChunks.length}] Waiting ${BATCH_DELAY_MS}ms before next chunk`,
      );
      await sleep(BATCH_DELAY_MS);
    }
  }

  if (failedCinemas.length > 0) {
    throw new Error(
      `Failed to update ${failedCinemas.length} CineStar cinemas: ${failedCinemas.join(", ")}`,
    );
  }
} finally {
  await db.$disconnect();
}

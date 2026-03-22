import { getPremiumKinoMovies } from "@waslaeuftin/cinemaProviders/premiumkino/getPremiumKinoMovies";
import { db } from "@waslaeuftin/server/db";
import {
  BATCH_DELAY_MS,
  chunkArray,
  CINEMA_BATCH_SIZE,
  sleep,
} from "./helpers";

const failedCinemas: string[] = [];

try {
  const premiumKinoCinemas = await db.cinema.findMany({
    where: { premiumKinoSubdomain: { not: null } },
  });
  console.info(
    `[PremiumKino] Found ${premiumKinoCinemas.length} cinemas to update`,
  );

  const cinemaChunks = chunkArray(premiumKinoCinemas, CINEMA_BATCH_SIZE);
  console.info(
    `[PremiumKino] Processing ${cinemaChunks.length} chunks with up to ${CINEMA_BATCH_SIZE} cinemas each`,
  );

  for (const [index, chunk] of cinemaChunks.entries()) {
    console.info(
      `[PremiumKino][Chunk ${index + 1}/${cinemaChunks.length}] Fetching provider data for ${chunk.length} cinemas`,
    );
    const cinemaResults = await Promise.allSettled(
      chunk.map((cinema) =>
        getPremiumKinoMovies(cinema.id, cinema.premiumKinoSubdomain!),
      ),
    );

    const successfulCinemaIds: number[] = [];
    const successfulCinemaData: Awaited<
      ReturnType<typeof getPremiumKinoMovies>
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
      `[PremiumKino][Chunk ${index + 1}/${cinemaChunks.length}] Fetch finished: ${successfulCinemaData.length} succeeded, ${failedCinemas.length} failed total`,
    );

    if (successfulCinemaData.length > 0) {
      const movies = successfulCinemaData.flatMap((data) => data.movies);

      const showings = successfulCinemaData.flatMap((data) =>
        data.showings.flat(),
      );

      console.info(
        `[PremiumKino][Chunk ${index + 1}/${cinemaChunks.length}] Writing ${movies.length} movies and ${showings.length} showings`,
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
        `[PremiumKino][Chunk ${index + 1}/${cinemaChunks.length}] Write finished`,
      );
    }

    if (index < cinemaChunks.length - 1) {
      console.info(
        `[PremiumKino][Chunk ${index + 1}/${cinemaChunks.length}] Waiting ${BATCH_DELAY_MS}ms before next chunk`,
      );
      await sleep(BATCH_DELAY_MS);
    }
  }

  if (failedCinemas.length > 0) {
    throw new Error(
      `Failed to update ${failedCinemas.length} PremiumKino cinemas: ${failedCinemas.join(", ")}`,
    );
  }
} finally {
  await db.$disconnect();
}

import { getCineplexMovies } from "@waslaeuftin/cinemaProviders/cineplex/getCinePlexMovies";
import { db } from "@waslaeuftin/server/db";
import {
  BATCH_DELAY_MS,
  chunkArray,
  CINEMA_BATCH_SIZE,
  sleep,
} from "./helpers";

try {
  const cineplexCinemas = await db.cinema.findMany({
    where: { cineplexCinemaId: { not: null } },
  });
  console.info(`[Cineplex] Found ${cineplexCinemas.length} cinemas to update`);

  const cinemaChunks = chunkArray(cineplexCinemas, CINEMA_BATCH_SIZE);
  console.info(
    `[Cineplex] Processing ${cinemaChunks.length} chunks with up to ${CINEMA_BATCH_SIZE} cinemas each`,
  );

  for (const [index, chunk] of cinemaChunks.entries()) {
    console.info(
      `[Cineplex][Chunk ${index + 1}/${cinemaChunks.length}] Fetching provider data for ${chunk.length} cinemas`,
    );
    const { movies, showings } = await getCineplexMovies(
      chunk.map((cinema) => ({
        cinemaId: cinema.id,
        cineplexCinemaId: cinema.cineplexCinemaId!,
      })),
    );
    console.info(
      `[Cineplex][Chunk ${index + 1}/${cinemaChunks.length}] Fetch finished: ${movies.length} movies, ${showings.length} showings`,
    );

    console.info(
      `[Cineplex][Chunk ${index + 1}/${cinemaChunks.length}] Writing ${movies.length} movies and ${showings.length} showings`,
    );

    await db.movie.deleteMany({
      where: {
        cinemaId: {
          in: chunk.map((cinema) => cinema.id),
        },
      },
    });
    await db.movie.createMany({ data: movies, skipDuplicates: true });
    await db.showing.createMany({
      data: showings,
    });
    console.info(
      `[Cineplex][Chunk ${index + 1}/${cinemaChunks.length}] Write finished`,
    );

    if (index < cinemaChunks.length - 1) {
      console.info(
        `[Cineplex][Chunk ${index + 1}/${cinemaChunks.length}] Waiting ${BATCH_DELAY_MS}ms before next chunk`,
      );
      await sleep(BATCH_DELAY_MS);
    }
  }
} finally {
  await db.$disconnect();
}

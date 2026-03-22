import { getComtradaCineOrderMovies } from "@waslaeuftin/cinemaProviders/comtrada/cineorder/getComtradaCineOrderMovies";
import { db } from "@waslaeuftin/server/db";
import {
  BATCH_DELAY_MS,
  chunkArray,
  CINEMA_BATCH_SIZE,
  sleep,
} from "./helpers";

const failedCinemas: string[] = [];

try {
  const comtradaCineOrderCinemas = await db.cinema.findMany({
    where: { comtradaCineOrderMetadata: { isNot: null } },
    include: { comtradaCineOrderMetadata: true },
  });
  console.info(
    `[Comtrada] Found ${comtradaCineOrderCinemas.length} cinemas to update`,
  );

  const cinemaChunks = chunkArray(comtradaCineOrderCinemas, CINEMA_BATCH_SIZE);
  console.info(
    `[Comtrada] Processing ${cinemaChunks.length} chunks with up to ${CINEMA_BATCH_SIZE} cinemas each`,
  );

  for (const [index, chunk] of cinemaChunks.entries()) {
    console.info(
      `[Comtrada][Chunk ${index + 1}/${cinemaChunks.length}] Fetching provider data for ${chunk.length} cinemas`,
    );
    const cinemaResults = await Promise.allSettled(
      chunk.map((cinema) =>
        getComtradaCineOrderMovies(
          cinema.id,
          cinema.comtradaCineOrderMetadata!,
        ),
      ),
    );

    const successfulCinemaIds: number[] = [];
    const successfulCinemaData: Awaited<
      ReturnType<typeof getComtradaCineOrderMovies>
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
      `[Comtrada][Chunk ${index + 1}/${cinemaChunks.length}] Fetch finished: ${successfulCinemaData.length} succeeded, ${failedCinemas.length} failed total`,
    );

    if (successfulCinemaData.length > 0) {
      const comtradaCineOrderMovies = successfulCinemaData.flatMap(
        (data) => data.movies,
      );

      const comtradaCineOrderShowings = successfulCinemaData.flatMap(
        (data) => data.showings,
      );

      console.info(
        `[Comtrada][Chunk ${index + 1}/${cinemaChunks.length}] Writing ${comtradaCineOrderMovies.length} movies and ${comtradaCineOrderShowings.length} showings`,
      );

      await db.movie.deleteMany({
        where: {
          cinemaId: {
            in: successfulCinemaIds,
          },
        },
      });
      await db.movie.createMany({
        data: comtradaCineOrderMovies,
        skipDuplicates: true,
      });
      await db.showing.createMany({
        data: comtradaCineOrderShowings,
      });
      console.info(
        `[Comtrada][Chunk ${index + 1}/${cinemaChunks.length}] Write finished`,
      );
    }

    if (index < cinemaChunks.length - 1) {
      console.info(
        `[Comtrada][Chunk ${index + 1}/${cinemaChunks.length}] Waiting ${BATCH_DELAY_MS}ms before next chunk`,
      );
      await sleep(BATCH_DELAY_MS);
    }
  }

  if (failedCinemas.length > 0) {
    throw new Error(
      `Failed to update ${failedCinemas.length} Comtrada cinemas: ${failedCinemas.join(", ")}`,
    );
  }
} finally {
  await db.$disconnect();
}

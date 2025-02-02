import { getKinoHeldMovies } from "@waslaeuftin/cinemaProviders/kinoheld/getKinoHeldMovies";
import { db } from "@waslaeuftin/server/db";

const kinoHeldCinemas = await db.cinema.findMany({
  where: { kinoHeldCinemasMetadata: { isNot: null } },
  include: { kinoHeldCinemasMetadata: true },
});

const kinoHeldData = await Promise.all(
  kinoHeldCinemas.map((cinema) =>
    getKinoHeldMovies(cinema.id, cinema.kinoHeldCinemasMetadata!),
  ),
);

const movies = kinoHeldData.flatMap((data) => data.movies);

const showings = kinoHeldData.flatMap((data) => data.showings.flat());

await db.$transaction([
  db.movie.deleteMany({
    where: {
      cinemaId: {
        in: kinoHeldCinemas.map((cinema) => cinema.id),
      },
    },
  }),
  db.movie.createMany({ data: movies, skipDuplicates: true }),
  db.showing.createMany({
    data: showings,
  }),
]);

const foo = await db.movie.count({
  where: {
    cinemaId: {
      in: kinoHeldCinemas.map((cinema) => cinema.id),
    },
  },
});

console.log(foo);

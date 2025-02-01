import { getKinoHeldMovies } from "@waslaeuftin/cinemaProviders/kinoheld/getKinoHeldMovies";
import { db } from "@waslaeuftin/server/db";

const kinoHeldCinemas = await db.cinema.findMany({
  where: { kinoHeldCinemasMetadata: { isNot: null } },
  include: { kinoHeldCinemasMetadata: true },
});

const { movies, showings } = await getKinoHeldMovies(611, {
  centerId: "MzA3ODQ4",
  centerShorty: "cinemotion-berlin-hohenschoenhausen",
  createdAt: new Date(),
  updatedAt: new Date(),
  id: 1,
});

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

import { getComtradaCineOrderMovies } from "@waslaeuftin/helpers/comtrada/cineorder/getComtradaCineOrderMovies";
import { getComtradaForumCinemasMovies } from "@waslaeuftin/helpers/comtrada/forum-cinemas/getComtradaForumCinemasMovies";
import { getKinoTicketsExpressMovies } from "@waslaeuftin/helpers/kino-ticket-express/getKinoTicketExpressMovies";
import { getKinoHeldMovies } from "@waslaeuftin/helpers/kinoheld/getKinoHeldMovies";
import { db } from "@waslaeuftin/server/db";
import {
  ComtradaCineOrderCinemas,
  type CinemaSlugs,
  ComtradaForumCinemas,
  KinoTicketsExpressCinemas,
  KinoHeldCinemas,
} from "@waslaeuftin/types/Movie";
import { NextResponse } from "next/server";

export async function GET() {
  const movies = (
    await Promise.all([
      ...ComtradaCineOrderCinemas.options.map((cinema) =>
        getComtradaCineOrderMovies(cinema),
      ),
      ...ComtradaForumCinemas.options.map((cinema) =>
        getComtradaForumCinemasMovies(cinema),
      ),
      ...KinoTicketsExpressCinemas.options.map((cinema) =>
        getKinoTicketsExpressMovies(cinema),
      ),
      ...KinoHeldCinemas.options.map((cinema) => getKinoHeldMovies(cinema)),
    ])
  ).flat();

  await db.showing.deleteMany({});
  await db.movie.deleteMany({});

  await db.movie.createMany({
    data: movies.map((movie) => ({
      name: movie.name,
      cinemaSlug: movie.cinema.slug,
    })),
  });

  const createdMovies = await db.movie.findMany();

  const moviesMappedByCinemaAndName = createdMovies.reduce(
    (acc, movie) => {
      acc[movie.cinemaSlug as CinemaSlugs] =
        acc[movie.cinemaSlug as CinemaSlugs] ?? {};

      acc[movie.cinemaSlug as CinemaSlugs][movie.name] = movie;
      return acc;
    },
    {} as Record<
      CinemaSlugs,
      Record<string, Awaited<ReturnType<typeof db.movie.findMany>>[number]>
    >,
  );

  await db.showing.createMany({
    data: movies
      .map((movie) =>
        movie.showings.map((showing) => ({
          dateTime: showing.dateTime,
          bookingUrl: showing.bookingUrl,
          movieId:
            moviesMappedByCinemaAndName[movie.cinema.slug][movie.name]?.id ??
            -200,
          showingAdditionalData: showing.showingAdditionalData,
        })),
      )
      .flat(),
  });

  return new NextResponse(
    JSON.stringify({ message: "Movies were successfully updated" }),
  );
}

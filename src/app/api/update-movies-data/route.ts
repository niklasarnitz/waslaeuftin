import { getComtradCineOrderMovies } from "@waslaeuftin/helpers/comtrada/cineorder/getComtradaCineOrderMovies";
import { getComtradaForumCinemasMovies } from "@waslaeuftin/helpers/comtrada/forum-cinemas/getComtradaForumCinemasMovies";
import { getKinoTicketsExpressMovies } from "@waslaeuftin/helpers/kino-ticket-express/getKinoTicketExpressMovies";
import { getKinoHeldMovies } from "@waslaeuftin/helpers/kinoheld/getKinoHeldMovies";
import { db } from "@waslaeuftin/server/db";
import { type CinemaSlugs, Cinemas } from "@waslaeuftin/types/Movie";
import { NextResponse } from "next/server";

export async function GET() {
  const movies = (
    await Promise.all([
      getComtradCineOrderMovies(Cinemas.zkm_karlsruhe),
      getKinoTicketsExpressMovies("karlsruhe_kinemathek"),
      getKinoTicketsExpressMovies("karlsruhe_schauburg"),
      getComtradaForumCinemasMovies("forum_lahr"),
      getComtradaForumCinemasMovies("forum_offenburg"),
      getComtradaForumCinemasMovies("forum_rastatt"),
      getKinoHeldMovies("traumpalast_leonberg"),
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
      acc[movie.cinemaSlug] = acc[movie.cinemaSlug] ?? {};

      acc[movie.cinemaSlug][movie.name] = movie;
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

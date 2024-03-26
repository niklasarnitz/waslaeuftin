import { getComtradCineOrderMovies } from "@waslaeuftin/helpers/comtrada/cineorder/getComtradaCineOrderMovies";
import { getKinoTicketsExpressMovies } from "@waslaeuftin/helpers/kino-ticket-express/getKinoTicketExpressMovies";
import { db } from "@waslaeuftin/server/db";
import { Cinemas } from "@waslaeuftin/types/Movie";
import moment from "moment";
import { NextResponse } from "next/server";

export async function GET() {
  const movies = (
    await Promise.all([
      getComtradCineOrderMovies(Cinemas.zkm_karlsruhe),
      getKinoTicketsExpressMovies("karlsruhe_kinemathek"),
      getKinoTicketsExpressMovies("karlsruhe_schauburg"),
    ])
  ).flat();

  await Promise.all(
    movies.map(async (movie) => {
      const existingMovie = await db.movie.findFirst({
        where: {
          name: movie.name,
          cinemaSlug: movie.cinema.slug,
        },
        include: {
          showings: true,
        },
      });

      if (existingMovie) {
        await db.movie.update({
          where: {
            id: existingMovie.id,
          },
          data: {
            showings: {
              connectOrCreate: movie.showings.map((showing) => ({
                where: {
                  id:
                    existingMovie.showings.find((s) =>
                      moment(s.dateTime).isSame(showing.dateTime, "minute"),
                    )?.id ?? -200,
                  dateTime: showing.dateTime,
                  bookingUrl: showing.bookingUrl,
                },
                create: {
                  dateTime: showing.dateTime,
                  bookingUrl: showing.bookingUrl,
                },
              })),
            },
          },
        });
      } else {
        await db.movie.create({
          data: {
            name: movie.name,
            cinemaSlug: movie.cinema.slug,
            showings: {
              createMany: {
                data: movie.showings.map((showing) => ({
                  dateTime: showing.dateTime,
                  bookingUrl: showing.bookingUrl,
                })),
              },
            },
          },
        });
      }
    }),
  );

  return new NextResponse(
    JSON.stringify({ message: "Movies were successfully updated" }),
  );
}
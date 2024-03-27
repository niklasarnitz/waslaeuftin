import { db } from "@waslaeuftin/server/db";
import { isMovie } from "@waslaeuftin/types/Movie";
import moment from "moment";
import { type NextRequest } from "next/server";

export const POST = async (request: NextRequest) => {
  const movie: unknown = await request.json();

  if (!isMovie(movie)) {
    return new Response(JSON.stringify({ message: "Invalid movie data" }), {
      status: 400,
    });
  }

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

  return new Response(
    JSON.stringify({ message: "Movie was successfully created" }),
  );
};

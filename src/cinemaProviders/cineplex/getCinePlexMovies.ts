import { ObjectHelper } from "@ainias42/js-helper";
import { ApolloClient, InMemoryCache, HttpLink, gql } from "@apollo/client";
import { type Prisma } from "@prisma/client";
import { UIConstants } from "@waslaeuftin/globals/UIConstants";
import { type db } from "@waslaeuftin/server/db";
import moment from "moment-timezone";

const client = new ApolloClient({
  link: new HttpLink({
    uri: "https://graphql-api.app.cineplex.de",
  }),
  cache: new InMemoryCache(),
});

const getQuery = (cineplexCinemaIds: string[]) => gql`
  query {
    screenedMovies(
      cinemaIds: [${cineplexCinemaIds.map((cinemaId) => `"${cinemaId}"`).join(", ")}]
      from: "${moment().subtract(1, "day").toISOString()}"
      to: "${moment().add(10, "days").toISOString()}"
    ) {
      id
      movie {
        title
        screenings {
          cinema {
            id
          }
          onlineTicketingId
          datetime
          auditoriumName
          attributes {
            label
          }
        }
      }
    }
  }
`;

export const getCineplexMovies = async (
  cinemas: {
    cinemaId: number;
    cineplexCinemaId: string;
  }[],
) => {
  const { data } = await client.query<{
    screenedMovies: {
      id: string;
      movie: {
        title: string;
        screenings: {
          cinema: {
            id: string;
          };
          onlineTicketingId: string;
          datetime: string;
          auditoriumName: string;
          attributes: {
            label: string | null;
          }[];
        }[];
      }[];
    }[];
  }>({
    query: getQuery(cinemas.map((cinema) => cinema.cineplexCinemaId)),
  });

  const cinemasByCineplexCinemaId = cinemas.reduce(
    (acc, cinema) => {
      acc[cinema.cineplexCinemaId] = cinema;
      return acc;
    },
    {} as Record<string, (typeof cinemas)[number]>,
  );

  const screeningsWithMovieAndCinema = (
    data.screenedMovies
      .map((screenedMovie) => screenedMovie.movie)
      .flat()
      .map((movie) =>
        movie.screenings.map((screening) => ({
          onlineTicketingId: screening.onlineTicketingId,
          auditoriumName: screening.auditoriumName,
          datetime: screening.datetime,
          attributes: screening.attributes.filter(
            (attribute) => !!attribute.label,
          ),
          movie: {
            title: movie.title,
            cinemaId: cinemasByCineplexCinemaId[screening.cinema.id]?.cinemaId,
          },
        })),
      )
      .flat()
      .filter((screening) => !!screening.movie.cinemaId) as {
      onlineTicketingId: string;
      auditoriumName: string;
      datetime: string;
      attributes: {
        label: string | null;
      }[];
      movie: {
        title: string;
        cinemaId: number;
      };
    }[]
  ).reduce(
    (acc, screening) => {
      const cinema = acc[screening.movie.cinemaId];

      if (cinema) {
        const movie = cinema[screening.movie.title];

        if (!movie) {
          cinema[screening.movie.title] = [screening];
          return acc;
        } else {
          movie.push(screening);
          return acc;
        }
      } else {
        acc[screening.movie.cinemaId] = {
          [screening.movie.title]: [screening],
        };
        return acc;
      }
    },
    {} as Record<
      string,
      Record<
        string,
        {
          onlineTicketingId: string;
          auditoriumName: string;
          datetime: string;
          attributes: {
            label: string | null;
          }[];
        }[]
      >
    >,
  );

  return ObjectHelper.entries(screeningsWithMovieAndCinema)
    .map(([cinemaId, movies]) => {
      return ObjectHelper.entries(movies).map(([movieTitle, screenings]) => {
        return {
          name: movieTitle,
          cinemaId: parseInt(cinemaId),
          showings: {
            createMany: {
              data: screenings.map((screening) => ({
                dateTime: moment(screening.datetime).toDate(),
                bookingUrl: `https://buchung.cineplex.de/checkout/${screening.onlineTicketingId}init`,
                showingAdditionalData: [
                  screening.auditoriumName,
                  ...screening.attributes
                    .map((attribute) => attribute.label)
                    .filter(Boolean),
                ].join(UIConstants.bullet),
              })),
            },
          },
        } satisfies Prisma.Args<typeof db.movie, "create">["data"];
      });
    })
    .flat();
};

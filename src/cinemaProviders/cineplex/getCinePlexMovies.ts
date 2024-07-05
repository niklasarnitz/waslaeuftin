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

const getQuery = (cineplexCinemaId: string) => gql`query {
	cinema(id: "${cineplexCinemaId}"){
		movies {
			title
			screenings {
				id
				datetime
				auditoriumName
        onlineTicketingId
			}
		}
	}
}`;

export const getCineplexMovies = async (
  cinemaId: number,
  cineplexCinemaId: string,
) => {
  const { data } = await client.query<{
    cinema: {
      movies: {
        title: string;
        screenings: {
          id: string;
          datetime: string;
          auditoriumName: string;
          onlineTicketingId: string;
        }[];
      }[];
    };
  }>({
    query: getQuery(cineplexCinemaId),
  });

  return data.cinema.movies.map(
    (movie) =>
      ({
        name: movie.title,
        cinemaId,
        showings: {
          createMany: {
            data: movie.screenings.map((screening) => ({
              dateTime: moment(screening.datetime).toDate(),
              bookingUrl: `https://buchung.cineplex.de/checkout/${screening.onlineTicketingId}init`,
              showingAdditionalData: [screening.auditoriumName].join(
                UIConstants.bullet,
              ),
            })),
          },
        },
      }) satisfies Prisma.Args<typeof db.movie, "create">["data"],
  );
};

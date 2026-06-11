import type { TypedDocumentNode } from "@apollo/client";
import { ApolloClient, gql, HttpLink, InMemoryCache } from "@apollo/client";
import moment from "moment-timezone";

interface CineplexScreeningsResponse {
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
}

const client = new ApolloClient({
  link: new HttpLink({
    uri: "https://graphql-api.app.cineplex.de",
  }),
  cache: new InMemoryCache(),
});

const getQuery = (
  cineplexCinemaIds: string[],
): TypedDocumentNode<CineplexScreeningsResponse> =>
  gql`
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
  const { data } = await client.query({
    query: getQuery(cinemas.map((cinema) => cinema.cineplexCinemaId)),
  });

  if (!data) {
    throw new Error("Could not load Cineplex screenings");
  }

  const cinemasByCineplexCinemaId: Record<string, (typeof cinemas)[number]> =
    {};
  for (const cinema of cinemas) {
    cinemasByCineplexCinemaId[cinema.cineplexCinemaId] = cinema;
  }

  const showings = data.screenedMovies
    .map((screenedMovie) => screenedMovie.movie)
    .flat()
    .map((movie) =>
      movie.screenings.map((screening) => ({
        cinemaId: cinemasByCineplexCinemaId[screening.cinema.id]?.cinemaId,
        movieName: movie.title,
        dateTime: moment(screening.datetime).toDate(),
        bookingUrl: `https://buchung.cineplex.de/checkout/${screening.onlineTicketingId}init`,
        showingAdditionalData: [
          screening.auditoriumName,
          ...screening.attributes
            .map((attribute) => attribute.label)
            .filter(Boolean),
        ].filter((v): v is string => typeof v === "string" && v.length > 0),
      })),
    )
    .flat()
    .filter((showing) => !!showing.cinemaId) as {
    cinemaId: number;
    movieName: string;
    dateTime: Date;
    bookingUrl: string;
    showingAdditionalData: string[];
  }[];

  const movies = showings.flatMap((showing) => ({
    name: showing.movieName,
    cinemaId: showing.cinemaId,
  }));

  return {
    movies,
    showings,
  };
};

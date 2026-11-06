import type { TypedDocumentNode } from "@apollo/client";
import { ApolloClient, gql, HttpLink, InMemoryCache } from "@apollo/client";
import { ServerError } from "@apollo/client/errors";
import { RetryLink } from "@apollo/client/link/retry";
import moment from "moment-timezone";

import type { ProviderCatalog } from "@waslaeuftin/cinema-providers/internal/ProviderCatalog";

interface CineplexScreeningsResponse {
  screenedMovies: {
    id: string;
    movie: {
      id?: string | null;
      title: string;
      duration?: number | null;
      credits?:
        | ({
            department?: string | null;
            role?: string | null;
            person?: { fullName?: string | null } | null;
          } | null)[]
        | null;
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
  link: new RetryLink({
    delay: (attempt) => 1000 * 2 ** (attempt - 1),
    attempts: (attempt, operation, error) => {
      if (!ServerError.is(error)) return false;

      const retry = [502, 503, 504].includes(error.statusCode) && attempt < 3;
      const details = {
        cinemas: operation.getContext().cinemas as unknown,
        status: error.statusCode,
        attempt,
        retryInMs: retry ? 1000 * 2 ** (attempt - 1) : null,
        server: error.response.headers.get("server"),
        via: error.response.headers.get("via"),
        requestId: error.response.headers.get("x-request-id"),
        cfRay: error.response.headers.get("cf-ray"),
        responseBody: error.bodyText.slice(0, 1000),
      };
      if (retry) {
        console.warn("[Cineplex] API request failed; retrying", details);
      } else {
        console.error("[Cineplex] API request failed; giving up", details);
      }
      return retry;
    },
  }).concat(
    new HttpLink({
      uri: "https://graphql-api.app.cineplex.de",
    }),
  ),
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
          id
          title
          duration
          credits(departments: [DIRECTING]) {
            department
            role
            person {
              fullName
            }
          }
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
): Promise<ProviderCatalog> => {
  const { data } = await client.query({
    fetchPolicy: "no-cache",
    query: getQuery(cinemas.map((cinema) => cinema.cineplexCinemaId)),
    context: { cinemas },
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
    .map((movie) => {
      const director = (Array.isArray(movie.credits) ? movie.credits : [])
        .filter(
          (credit) =>
            credit?.department === "DIRECTING" &&
            typeof credit.role === "string" &&
            /^(?:Regie|Director)$/i.test(credit.role.trim()),
        )
        .map((credit) => credit?.person?.fullName)
        .filter(
          (name): name is string => typeof name === "string" && !!name.trim(),
        )
        .map((name) => name.trim())
        .join(", ");
      const evidence = {
        ...(director ? { director } : {}),
        ...(typeof movie.duration === "number" &&
        Number.isSafeInteger(movie.duration) &&
        movie.duration > 0
          ? { runtimeMinutes: movie.duration }
          : {}),
      };
      return movie.screenings.map((screening) => ({
        cinemaId: cinemasByCineplexCinemaId[screening.cinema.id]?.cinemaId,
        movieName: movie.title,
        provider: "Cineplex",
        providerFilmId:
          typeof movie.id === "string" && movie.id.trim()
            ? movie.id
            : undefined,
        ...(Object.keys(evidence).length ? { evidence } : {}),
        dateTime: moment(screening.datetime).toDate(),
        bookingUrl: `https://buchung.cineplex.de/checkout/${screening.onlineTicketingId}init`,
        showingAdditionalData: [
          screening.auditoriumName,
          ...screening.attributes
            .map((attribute) => attribute.label)
            .filter(Boolean),
        ].filter((v): v is string => typeof v === "string" && v.length > 0),
      }));
    })
    .flat()
    .filter(
      (showing): showing is typeof showing & { cinemaId: number } =>
        !!showing.cinemaId,
    );

  const movies = showings.flatMap((showing) => ({
    name: showing.movieName,
    cinemaId: showing.cinemaId,
    provider: showing.provider,
    providerFilmId: showing.providerFilmId,
    ...(showing.evidence ? { evidence: showing.evidence } : {}),
  }));

  return {
    provider: "Cineplex",
    movies,
    showings,
  };
};

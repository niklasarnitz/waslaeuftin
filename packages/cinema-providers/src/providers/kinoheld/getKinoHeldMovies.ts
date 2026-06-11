import type { TypedDocumentNode } from "@apollo/client";
import { ApolloClient, gql, HttpLink, InMemoryCache } from "@apollo/client";
import moment from "moment-timezone";

import type { KinoHeldCinemasMetadata } from "@waslaeuftin/db";
import { getKinoHeldBookingUrl } from "@waslaeuftin/cinema-providers/internal/providers/kinoheld/getKinoHeldBookingUrl";
import { FETCH_SHOW_GROUPS_FOR_CINEMA } from "@waslaeuftin/cinema-providers/internal/providers/kinoheld/kinoHeld_FETCH_SHOW_GROUPS_FOR_CINEMA";
import { type ShowGroup } from "@waslaeuftin/cinema-providers/internal/providers/kinoheld/ShowGroup";

const httpLink = new HttpLink({
  uri: "https://next-live.kinoheld.de/graphql",
});

const client = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
});

interface CinemaAuditoriumCountResponse {
  cinema: {
    auditoriums: {
      data: { id: string }[];
    };
  } | null;
}

interface CinemaAuditoriumCountVariables {
  cinemaId: string;
}

const FETCH_CINEMA_AUDITORIUM_COUNT = gql`
  query FetchCinemaAuditoriumCount($cinemaId: ID) {
    cinema(id: $cinemaId) {
      auditoriums {
        data {
          id
        }
      }
    }
  }
` as TypedDocumentNode<
  CinemaAuditoriumCountResponse,
  CinemaAuditoriumCountVariables
>;

const auditoriumCache = new Map<string, Promise<boolean>>();
const MAX_CACHE_SIZE = 100;

async function getCinemaHasMultipleAuditoriums(
  centerId: string,
): Promise<boolean> {
  if (auditoriumCache.has(centerId)) {
    return auditoriumCache.get(centerId)!;
  }

  const promise = client
    .query({
      query: FETCH_CINEMA_AUDITORIUM_COUNT,
      variables: { cinemaId: centerId },
    })
    .then(({ data }) => {
      return (data?.cinema?.auditoriums?.data?.length ?? 0) > 1;
    })
    .catch((error) => {
      auditoriumCache.delete(centerId);
      throw error;
    });

  if (auditoriumCache.size >= MAX_CACHE_SIZE) {
    const firstKey = auditoriumCache.keys().next().value;
    if (firstKey) {
      auditoriumCache.delete(firstKey);
    }
  }

  auditoriumCache.set(centerId, promise);
  return promise;
}

export async function getKinoHeldMoviesInner(
  metadata: KinoHeldCinemasMetadata,
  page = 1,
  allData: ShowGroup[] = [],
): Promise<ShowGroup[]> {
  const { data } = await client.query({
    query: FETCH_SHOW_GROUPS_FOR_CINEMA,
    variables: {
      cinemaId: metadata.centerId,
      first: 100,
      page,
    },
  });

  if (!data) {
    throw new Error("Could not load KinoHeld show groups");
  }

  const newData = allData.concat(data.showGroups.data);
  if (data.showGroups.paginatorInfo.hasMorePages) {
    return await getKinoHeldMoviesInner(metadata, page + 1, newData);
  } else {
    return newData;
  }
}

export async function getKinoHeldMovies(
  cinemaId: number,
  metadata: KinoHeldCinemasMetadata,
) {
  const [movies, hasMultipleAuditoriums] = await Promise.all([
    getKinoHeldMoviesInner(metadata),
    getCinemaHasMultipleAuditoriums(metadata.centerId),
  ]);

  const transformedMovies = movies.map((movie) => {
    const showings = movie.shows.data.map((showing) => {
      const showingAdditionalData = Array.from(
        new Set([
          ...(showing?.flags?.map((flag) => flag?.name ?? "") ?? []),
          ...(hasMultipleAuditoriums ? [showing?.auditorium?.name ?? ""] : []),
        ]),
      ).filter((item) => item !== "");

      return {
        dateTime: moment(showing?.beginning).toDate(),
        bookingUrl: getKinoHeldBookingUrl(movie, showing),
        showingAdditionalData,
      };
    });

    return {
      name: movie.movie.title,
      cinemaId,
      showings,
    };
  });

  return {
    movies: transformedMovies.flatMap((movie) => ({
      name: movie.name,
      cinemaId,
    })),
    showings: transformedMovies.flatMap((movie) =>
      movie.showings.flatMap((showing) => ({
        ...showing,
        cinemaId,
        movieName: movie.name,
      })),
    ),
  };
}

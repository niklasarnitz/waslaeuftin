import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";
import { UIConstants } from "@waslaeuftin/globals/UIConstants";
import moment from "moment-timezone";
import { type Prisma, type KinoHeldCinemasMetadata } from "@prisma/client";
import { type db } from "@waslaeuftin/server/db";
import { FETCH_SHOW_GROUPS_FOR_CINEMA } from "./KinoHeldQuery";
import { type ShowGroup } from "./ShowGroup";
import { type FetchShowGroupsResponse } from "./FetchShowGroupsResponse";
import { getKinoHeldBookingUrl } from "./getKinoHeldBookingUrl";

const httpLink = new HttpLink({
  uri: "https://next-live.kinoheld.de/graphql",
});

const client = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
});

async function getKinoHeldMoviesInner(
  metadata: KinoHeldCinemasMetadata,
  page = 1,
  allData: ShowGroup[] = [],
): Promise<ShowGroup[]> {
  const { data } = await client.query<FetchShowGroupsResponse>({
    query: FETCH_SHOW_GROUPS_FOR_CINEMA,
    variables: {
      cinemaId: metadata.centerId,
      first: 100,
      page,
      playing: {},
    },
  });

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
  const movies = await getKinoHeldMoviesInner(metadata);

  const transformedMovies = movies.map((movie) => {
    const showings = movie.shows.data.map((showing) => {
      const showingAdditionalData = Array.from(
        new Set([
          ...movie.movie.genres.map((genre) => genre?.name ?? ""),
          movie.movie.contentRating?.name
            ? `FSK-${movie.movie.contentRating?.name ?? ""}`
            : "",
          ...(showing?.flags?.map((flag) => flag?.name ?? "") ?? []),
          showing?.auditorium?.name ?? "",
        ]),
      )
        .filter((item) => item !== "")
        .join(UIConstants.bullet);

      return {
        dateTime: moment(showing?.beginning).toDate(),
        bookingUrl: getKinoHeldBookingUrl(metadata, movie, showing),
        showingAdditionalData,
      };
    });

    return {
      name: movie.name,
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
    ) satisfies Prisma.Args<typeof db.showing, "createMany">["data"],
  };
}

import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";
import { gql } from "@apollo/client";
import { type Showing } from "@waslaeuftin/types/Showing";
import { type KinoHeldCinemasType } from "@waslaeuftin/types/KinoHeldCinemas";
import { UIConstants } from "@waslaeuftin/globals/UIConstants";
import moment from "moment-timezone";
import { type Prisma, type KinoHeldCinemasMetadata } from "@prisma/client";
import { type db } from "@waslaeuftin/server/db";

const httpLink = new HttpLink({
  uri: "https://next-live.kinoheld.de/graphql",
});

const client = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
});

const FETCH_SHOW_GROUPS_FOR_CINEMA = gql`
  query FetchShowGroupsForCinema(
    $cinemaId: ID
    $cinemaProximity: Proximity
    $playing: Playing!
    $auditoriums: [ID!]
    $genres: [String!]
    $flags: [String!]
    $contentRatings: [ID!]
    $showGroups: [String!]
    $actors: [ID!]
    $periods: [ShowPeriod!]
    $times: [Time!]
    $timesOfDay: [ShowTimeOfDay!]
    $first: Int
    $page: Int
  ) {
    showGroups(
      playing: $playing
      cinemaId: $cinemaId
      cinemaProximity: $cinemaProximity
      auditoriums: $auditoriums
      genres: $genres
      flags: $flags
      contentRatings: $contentRatings
      showGroups: $showGroups
      actors: $actors
      periods: $periods
      times: $times
      timesOfDay: $timesOfDay
      first: $first
      page: $page
    ) {
      paginatorInfo {
        count
        currentPage
        firstItem
        hasMorePages
        lastItem
        perPage
        __typename
      }
      data {
        uuid
        name
        flags {
          category
          isCinemaSpecific
          description
          code
          name
          __typename
        }
        movie {
          id
          title
          urlSlug
          duration
          description
          additionalDescription
          additionalInfo
          distributor
          publisherUrl
          released
          startdate
          productionYear
          productionCountries {
            name
            __typename
          }
          heroImageAlignment
          contentRating {
            id
            aliases
            contentRatingSystem {
              name
              __typename
            }
            description
            icon {
              url
              colors
              __typename
            }
            minimumAge
            minimumAgeAccompanied
            name
            __typename
          }
          jugendFilmJury {
            jfjAgeFrom
            __typename
          }
          thumbnailImage {
            id
            url
            colors
            width
            height
            license
            licenseUrl
            credit
            __typename
          }
          hasTrailers
          hasMedia
          genres {
            id
            name
            urlSlug
            __typename
          }
          __typename
        }
        cinema {
          city {
            id
            distance
            latitude
            urlSlug
            longitude
            name
            timezone
            __typename
          }
          __typename
        }
        shows(playing: $playing, flags: $flags) {
          data {
            id
            name
            urlSlug
            admission
            beginning
            endreservation
            endsale
            startreservation
            startsale
            deeplink
            flags {
              category
              isCinemaSpecific
              description
              code
              name
              __typename
            }
            auditorium {
              id
              name
              __typename
            }
            __typename
          }
          __typename
        }
        __typename
      }
      __typename
    }
  }
`;

interface ShowGroup {
  uuid: string;
  name: string;
  movie: {
    id: string;
    title: string;
    urlSlug: string;
    duration: number;
    description: string;
    additionalDescription: string | null;
    additionalInfo: string | null;
    distributor: string;
    publisherUrl: string | null;
    released: string;
    startdate: string;
    productionYear: string | null;
    productionCountries: {
      name: string | null;
    };
    heroImageAlignment: string;
    contentRating: {
      id: string;
      aliases: string | null;
      contentRatingSystem: {
        name: string | null;
      };
      description: string;
      icon: {
        url: string;
        colors: string[];
      };
      minimumAge: number;
      minimumAgeAccompanied: number;
      name: string;
    } | null;
    jugendFilmJury: null;
    thumbnailImage: {
      id: string;
      url: string;
      colors: string[];
      width: number;
      height: number;
      license: string | null;
      licenseUrl: string | null;
      credit: string | null;
    };
    hasTrailers: boolean;
    hasMedia: boolean;
    genres: ({
      id: string;
      name: string;
      urlSlug: string;
    } | null)[];
  };
  cinema: {
    city: {
      id: string;
      distance: number | null;
      latitude: number;
      urlSlug: string;
      longitude: number;
      name: string;
      timezone: string;
    };
  };
  shows: {
    data: ({
      id: string;
      name: string;
      urlSlug: string;
      admission: string;
      beginning: string;
      endreservation: string;
      endsale: string;
      startreservation: string;
      startsale: string;
      deeplink: string | null;
      flags:
        | ({
            category: string;
            isCinemaSpecific: boolean;
            description: string;
            code: string;
            name: string;
          } | null)[]
        | null;
      auditorium: {
        id: string;
        name: string;
      } | null;
    } | null)[];
  };
}

interface FetchShowGroupsResponse {
  showGroups: {
    paginatorInfo: {
      count: number;
      currentPage: number;
      firstItem: number | null;
      hasMorePages: boolean;
      lastItem: number | null;
      perPage: number;
      __typename: string;
    };
    data: ShowGroup[];
  };
}

export const KinoHeldCinemaIds: Record<KinoHeldCinemasType, string> = {
  traumpalast_leonberg: "1865",
  merkur_filmcenter_gaggenau: "964",
  moviac_baden_baden: "983",
  cineplex_baden_baden: "322",
  cineplex_bruchsal: "280",
  luxor_walldorf: "945",
};

export const KinoHeldCorrectedCinemas: Record<KinoHeldCinemasType, string> = {
  traumpalast_leonberg: "traumpalast-leonberg",
  merkur_filmcenter_gaggenau: "merkur-filmcenter-gaggenau",
  moviac_baden_baden: "moviac-kino-im-kaiserhof",
  cineplex_baden_baden: "cineplex-baden-baden",
  cineplex_bruchsal: "cineplex-bruchsal",
  luxor_walldorf: "luxor-walldorf",
};

const getBookingUrl = (
  metadata: KinoHeldCinemasMetadata,
  movie: ShowGroup,
  showing: ShowGroup["shows"]["data"][number],
) => {
  switch (metadata.centerShorty) {
    case "traumpalast-leonberg":
      return `https://tickets.traumpalast.de/kino/${movie.cinema.city.urlSlug}/${metadata.centerShorty}/vorstellung/${showing?.urlSlug ?? ""}`;
    case "merkur-filmcenter-gaggenau":
    case "moviac-baden-baden":
      return `https://www.kinoheld.de/kino/${movie.cinema.city.urlSlug}/${metadata.centerShorty}/vorstellung/${showing?.urlSlug ?? ""}`;
    case "cineplex-baden_baden":
    case "cineplex-bruchsal":
    case "luxor-walldorf":
      return showing?.deeplink ?? undefined;
    default:
      return undefined;
  }
};

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
    return getKinoHeldMoviesInner(metadata, page + 1, newData);
  } else {
    return newData;
  }
}

export async function getKinoHeldMovies(
  cinemaId: number,
  metadata: KinoHeldCinemasMetadata,
) {
  const movies = await getKinoHeldMoviesInner(metadata);

  return movies.map((movie) => {
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
        dateTime: moment(showing?.beginning ?? moment()).toDate(),
        bookingUrl: getBookingUrl(metadata, movie, showing),
        showingAdditionalData,
      } satisfies Showing;
    });

    return {
      name: movie.name,
      cinema: {
        connect: {
          id: cinemaId,
        },
      },
      showings: {
        createMany: {
          data: showings,
        },
      },
    } satisfies Prisma.Args<typeof db.movie, "create">["data"];
  });
}

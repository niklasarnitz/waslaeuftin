import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";
import { gql } from "@apollo/client";
import { type Movie } from "@waslaeuftin/types/Movie";
import { type Showing } from "@waslaeuftin/types/Showing";
import { Cinemas } from "@waslaeuftin/types/Cinemas";
import { type KinoHeldCinemasType } from "@waslaeuftin/types/KinoHeldCinemas";
import { UIConstants } from "@waslaeuftin/globals/UIConstants";
import moment from "moment";

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

const KinoHeldCinemaIds: Record<KinoHeldCinemasType, string> = {
  traumpalast_leonberg: "1865",
  merkur_filmcenter_gaggenau: "964",
  moviac_baden_baden: "983",
  cineplex_baden_baden: "322",
};

const KinoHeldCorrectedCinemas: Record<KinoHeldCinemasType, string> = {
  traumpalast_leonberg: "traumpalast-leonberg",
  merkur_filmcenter_gaggenau: "merkur-filmcenter-gaggenau",
  moviac_baden_baden: "moviac-kino-im-kaiserhof",
  cineplex_baden_baden: "cineplex-baden-baden",
};

const getBookingUrl = (
  cinema: KinoHeldCinemasType,
  movie: ShowGroup,
  showing: ShowGroup["shows"]["data"][number],
) => {
  switch (cinema) {
    case "traumpalast_leonberg":
      return `https://tickets.traumpalast.de/kino/${movie.cinema.city.urlSlug}/${KinoHeldCorrectedCinemas[cinema]}/vorstellung/${showing?.urlSlug ?? ""}`;
    case "merkur_filmcenter_gaggenau":
    case "moviac_baden_baden":
      return `https://www.kinoheld.de/kino/${movie.cinema.city.urlSlug}/${KinoHeldCorrectedCinemas[cinema]}/vorstellung/${showing?.urlSlug ?? ""}`;
    case "cineplex_baden_baden":
      return showing?.deeplink ?? undefined;
    default:
      return undefined;
  }
};

async function getKinoHeldMoviesInner(
  cinema: KinoHeldCinemasType,
  page = 1,
  allData: ShowGroup[] = [],
): Promise<ShowGroup[]> {
  const { data } = await client.query<FetchShowGroupsResponse>({
    query: FETCH_SHOW_GROUPS_FOR_CINEMA,
    variables: {
      cinemaId: KinoHeldCinemaIds[cinema],
      first: 100,
      page,
      playing: {},
    },
  });

  const newData = allData.concat(data.showGroups.data);
  if (data.showGroups.paginatorInfo.hasMorePages) {
    return getKinoHeldMoviesInner(cinema, page + 1, newData);
  } else {
    return newData;
  }
}

export async function getKinoHeldMovies(cinema: KinoHeldCinemasType) {
  const movies = await getKinoHeldMoviesInner(cinema);

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
        bookingUrl: getBookingUrl(cinema, movie, showing),
        showingAdditionalData,
      } satisfies Showing;
    });

    return {
      name: movie.name,
      cinema: Cinemas[cinema],
      showings,
    } satisfies Movie;
  });
}

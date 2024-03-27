import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";
import { gql } from "@apollo/client";
import { type Movie, type Showing, Cinemas } from "@waslaeuftin/types/Movie";
import { UIConstants } from "@waslaeuftin/globals/UIConstants";
import moment from "moment";
import { type KinoheldCinemasType } from "@waslaeuftin/helpers/kinoheld/helpers/kinoHeldCinemaSlugs";
import { KinoheldCinemaIds } from "@waslaeuftin/helpers/kinoheld/helpers/kinoHeldCinemaIds";
import { CorrectedCinemas } from "@waslaeuftin/helpers/kinoheld/helpers/kinoHeldCorrectedCinemas";

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

async function getKinoHeldMoviesInner(
  cinema: KinoheldCinemasType,
  page = 1,
  allData: ShowGroup[] = [],
): Promise<ShowGroup[]> {
  const { data } = await client.query<FetchShowGroupsResponse>({
    query: FETCH_SHOW_GROUPS_FOR_CINEMA,
    variables: {
      cinemaId: KinoheldCinemaIds[cinema],
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

export async function getKinoHeldMovies(cinema: KinoheldCinemasType) {
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
        bookingUrl: `https://tickets.traumpalast.de/kino/${movie.cinema.city.urlSlug}/${CorrectedCinemas[cinema]}/vorstellung/${showing?.urlSlug ?? ""}`,
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

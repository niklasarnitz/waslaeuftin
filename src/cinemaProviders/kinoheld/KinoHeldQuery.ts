import { gql } from "@apollo/client";

export const FETCH_SHOW_GROUPS_FOR_CINEMA = gql`
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

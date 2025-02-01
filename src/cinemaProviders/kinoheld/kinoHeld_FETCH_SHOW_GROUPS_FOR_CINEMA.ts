import { gql } from "@apollo/client";

export const FETCH_SHOW_GROUPS_FOR_CINEMA = gql`
  query FetchShowGroupsForCinema($cinemaId: ID, $first: Int, $page: Int) {
    showGroups(cinemaId: $cinemaId, first: $first, page: $page) {
      paginatorInfo {
        count
        currentPage
        firstItem
        hasMorePages
        lastItem
        perPage
      }
      data {
        uuid
        urlSlug
        name
        cinema {
          cid
          city {
            urlSlug
          }
        }
        movie {
          title
        }
        shows {
          data {
            id
            name
            beginning
            auditorium {
              name
            }
            audioLanguage {
              name
            }
            subtitleLanguage {
              name
            }
            urlSlug
            movie {
              title
            }
            cinema {
              cid
            }
            flags {
              id
              code
              category
              name
              isCinemaSpecific
              description
            }
            deeplink
          }
        }
      }
    }
  }
`;

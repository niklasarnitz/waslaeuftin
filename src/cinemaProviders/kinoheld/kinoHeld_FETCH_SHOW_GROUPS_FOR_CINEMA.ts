import { gql } from "@apollo/client";

export const FETCH_SHOW_GROUPS_FOR_CINEMA = gql`
  query FetchShowGroupsForCinema($cinemaId: ID, $first: Int, $page: Int) {
    showGroups(cinemaId: $cinemaId, first: $first, page: $page) {
      paginatorInfo {
        hasMorePages
      }
      data {
        cinema {
          urlSlug
          city {
            urlSlug
          }
        }
        movie {
          title
        }
        shows {
          data {
            beginning
            auditorium {
              name
            }
            urlSlug
            flags {
              name
            }
            deeplink
          }
        }
      }
    }
  }
`;

/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ApolloClient, HttpLink, InMemoryCache, gql } from "@apollo/client";
import { type CinemaSlugs, type Cinema } from "@waslaeuftin/types/Movie";
import { writeFile } from "fs/promises";

const httpLink = new HttpLink({
  uri: "https://next-live.kinoheld.de/graphql",
});

const client = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
});

const FETCH_CINEMAS = gql`
  query FetchCinemasForCinemaCards(
    $proximity: Proximity
    $search: String
    $types: [CinemaType!]
    $onlyBookable: Boolean
    $first: Int
    $page: Int
  ) {
    cinemas(
      proximity: $proximity
      search: $search
      types: $types
      onlyBookable: $onlyBookable
      first: $first
      page: $page
    ) {
      paginatorInfo {
        ...PaginatorInfoAttributes
      }
      data {
        id
        name
        urlSlug
        city {
          id
          name
          urlSlug
        }
        thumbnailImage {
          ...ImageAttributes
        }
      }
    }
  }

  fragment PaginatorInfoAttributes on PaginatorInfo {
    __typename
    count
    currentPage
    firstItem
    hasMorePages
    lastItem
    lastPage
    perPage
    total
  }

  fragment ImageAttributes on Image {
    id
    url
    colors(limit: 3)
    width
    height
  }
`;

async function getCinemasInner(page = 1, allData: any[] = []): Promise<any[]> {
  const { data } = await client.query({
    query: FETCH_CINEMAS,
    variables: {
      first: 100,
      page,
    },
  });

  const newData = allData.concat(data.cinemas.data);
  if (data.cinemas.paginatorInfo.hasMorePages) {
    return getCinemasInner(page + 1, newData);
  } else {
    return newData;
  }
}

const cinemas = await getCinemasInner();

console.log(cinemas.length);

await writeFile(
  "./kinoHeldCinemaSlugs.ts",
  `import { z } from "zod";\n\nexport const KinoheldCinemas = z.enum([${cinemas.map((cinema) => `"${cinema.urlSlug.replaceAll("-", "_")}"`).join(",")}]);\n\nexport type KinoheldCinemasType = z.infer<typeof KinoheldCinemas>;`,
);

const uniqueCorrectedCinemas = {
  ...cinemas.reduce(
    (acc, cinema) => {
      acc[`${cinema.urlSlug.replaceAll("-", "_")}`] = cinema.urlSlug;
      return acc;
    },
    {} as Record<string, string>,
  ),
};

await writeFile(
  "./kinoHeldCorrectedCinemas.ts",
  `import { type KinoheldCinemasType } from "@waslaeuftin/helpers/kinoheld/helpers/kinoHeldCinemaSlugs";\n\nexport const CorrectedCinemas: Record<KinoheldCinemasType, string> = ${JSON.stringify(uniqueCorrectedCinemas)};`,
);

const transformedCinemas = cinemas.reduce(
  (acc, cinema) => {
    acc[`${cinema.urlSlug.replaceAll("-", "_")}`] = {
      name: cinema.name as string,
      url: `https://www.kinoheld.de/kino/${cinema.city.urlSlug}/${cinema.urlSlug}/vorstellungen`,
      slug: cinema.urlSlug.replaceAll("-", "_") as CinemaSlugs,
    };
    return acc;
  },
  {} as Record<string, Cinema>,
);

await writeFile(
  "./kinoHeldCinemas.ts",
  `export const KinoHeldCinemas = ${JSON.stringify(transformedCinemas)};`,
);

const cinemaIds: Record<string, string> = cinemas.reduce(
  (acc, cinema) => {
    acc[`${cinema.urlSlug.replaceAll("-", "_")}`] = cinema.id;
    return acc;
  },
  {} as Record<string, string>,
);

await writeFile(
  "./kinoHeldCinemaIds.ts",
  `export const KinoheldCinemaIds = ${JSON.stringify(cinemaIds)};`,
);

import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";

import { FETCH_CINEMAS } from "@waslaeuftin/cinema-providers/internal/providers/kinoheld/kinoHeld_FETCH_CINEMAS";
import { type KinoHeldCinemaData } from "@waslaeuftin/cinema-providers/internal/providers/kinoheld/KinoHeldCinemasResponse";

const httpLink = new HttpLink({
  uri: "https://next-live.kinoheld.de/graphql",
});

const client = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
});

async function getKinoHeldCinemasInner(
  page = 1,
  allData: KinoHeldCinemaData[] = [],
): Promise<KinoHeldCinemaData[]> {
  const { data } = await client.query({
    query: FETCH_CINEMAS,
    variables: {
      first: 100,
      page,
    },
  });

  if (!data) {
    throw new Error("Could not load KinoHeld cinemas");
  }

  const newData = allData.concat(data.cinemas.data);
  if (data.cinemas.paginatorInfo.hasMorePages) {
    return await getKinoHeldCinemasInner(page + 1, newData);
  } else {
    return newData;
  }
}

export async function getKinoHeldCinemas() {
  const cinemas = await getKinoHeldCinemasInner();

  return cinemas;
}

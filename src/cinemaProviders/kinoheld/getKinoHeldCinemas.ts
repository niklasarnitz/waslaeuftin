import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";
import {
  type KinoHeldCinemaData,
  type KinoHeldCinemasResponse,
} from "@waslaeuftin/cinemaProviders/kinoheld/KinoHeldCinemasResponse";
import { FETCH_CINEMAS } from "@waslaeuftin/cinemaProviders/kinoheld/kinoHeld_FETCH_CINEMAS";

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
  const { data } = await client.query<KinoHeldCinemasResponse>({
    query: FETCH_CINEMAS,
    variables: {
      first: 100,
      page,
    },
  });

  console.log(
    "Currently at page " + page + " of " + data.cinemas.paginatorInfo.lastPage,
  );

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

import { ArrayHelper } from "@ainias42/js-helper";
import { ApolloClient, InMemoryCache, HttpLink, gql } from "@apollo/client";
import { Countries } from "@prisma/client";
import { db } from "@waslaeuftin/server/db";

const client = new ApolloClient({
  link: new HttpLink({
    uri: "https://graphql-api.app.cineplex.de",
  }),
  cache: new InMemoryCache(),
});

const query = gql`
  query {
    cinemas {
      id
      name
      city
    }
  }
`;

const { data } = await client.query<{
  cinemas: {
    id: string;
    name: string;
    city: string;
  }[];
}>({
  query,
});

if (!data) {
  throw new Error("Could not load cinemas from Cineplex API");
}

await ArrayHelper.asyncForEach(data.cinemas, async (cinema) => {
  console.log(cinema.city);

  const city = await db.city.upsert({
    where: {
      name: cinema.city,
    },
    create: {
      name: cinema.city,
      slug: cinema.city.toLowerCase().replace(/\s/g, "_"),
      country: Countries.GERMANY,
    },
    update: {},
  });

  await db.cinema.upsert({
    where: {
      cityId_slug: {
        cityId: city.id,
        slug: cinema.name.toLowerCase().replace(/\s/g, "_"),
      },
    },
    create: {
      name: cinema.name,
      slug: cinema.name.toLowerCase().replace(/\s/g, "_"),
      city: {
        connect: {
          id: city.id,
        },
      },
      cineplexCinemaId: cinema.id,
      country: Countries.GERMANY,
    },
    update: {},
  });

  console.log(`Cinema with name ${cinema.name} created`);
});

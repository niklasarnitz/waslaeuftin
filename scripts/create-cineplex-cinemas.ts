import { ArrayHelper } from "@ainias42/js-helper";
import { ApolloClient, InMemoryCache, HttpLink, gql } from "@apollo/client";
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

await ArrayHelper.asyncForEach(data.cinemas, async (cinema) => {
  console.log(cinema.city);

  let city = await db.city.findFirst({
    where: {
      OR: [
        {
          name: cinema.city,
        },
        {
          slug: cinema.city.toLowerCase().replace(/\s/g, "_"),
        },
      ],
    },
  });

  if (!city) {
    city = await db.city.create({
      data: {
        name: cinema.city,
        slug: cinema.city.toLowerCase().replace(/\s/g, "_"),
        country: "DE_DE",
      },
    });
  }

  const dbCinema = await db.cinema.findFirst({
    where: {
      slug: cinema.name.toLowerCase().replace(/\s/g, "_"),
    },
  });

  if (!dbCinema) {
    await db.cinema.create({
      data: {
        name: cinema.name,
        slug: cinema.name.toLowerCase().replace(/\s/g, "_"),
        city: {
          connect: {
            id: city.id,
          },
        },
        cineplexCinemaId: cinema.id,
      },
    });
  }

  console.log(`Cinema with name ${cinema.name} created`);
});

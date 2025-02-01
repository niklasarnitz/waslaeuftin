import { ArrayHelper } from "@ainias42/js-helper";
import { getKinoHeldCinemas } from "@waslaeuftin/cinemaProviders/kinoheld/getKinoHeldCinemas";
import { db } from "@waslaeuftin/server/db";

const cinemas = await getKinoHeldCinemas();

await ArrayHelper.asyncForEach(cinemas, async (cinema) => {
  let city = await db.city.findFirst({
    where: {
      name: cinema.city.name,
    },
  });

  if (!city) {
    city = await db.city.create({
      data: {
        name: cinema.city.name,
        slug: cinema.city.name.toLowerCase().replace(/\s/g, "_"),
      },
    });
  }

  await db.cinema.create({
    data: {
      name: cinema.name,
      slug: cinema.name.toLowerCase().replace(/\s/g, "_"),
      city: {
        connect: {
          id: city.id,
        },
      },
      kinoHeldCinemasMetadata: {
        create: {
          centerId: cinema.cid,
          centerShorty: cinema.urlSlug,
        },
      },
    },
  });

  console.log(`Cinema with name ${cinema.name} created`);
});

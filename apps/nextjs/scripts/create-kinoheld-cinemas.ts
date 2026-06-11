import { ArrayHelper } from "@ainias42/js-helper";

import { getKinoHeldCinemas } from "@waslaeuftin/cinema-providers/server";
import { Countries } from "@waslaeuftin/db";
import { db } from "@waslaeuftin/db/client";

const cinemas = await getKinoHeldCinemas();

await ArrayHelper.asyncForEach(cinemas, async (cinema) => {
  const city = await db.city.upsert({
    where: {
      name: cinema.city.name,
    },
    create: {
      name: cinema.city.name,
      slug: cinema.city.name.toLowerCase().replace(/\s/g, "_"),
      country: Countries.GERMANY,
    },
    update: {},
  });

  await db.cinema.upsert({
    where: {
      cityId_slug: {
        slug: cinema.name.toLowerCase().replace(/\s/g, "_"),
        cityId: city.id,
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
      kinoHeldCinemasMetadata: {
        create: {
          centerId: cinema.cid,
          centerShorty: cinema.urlSlug,
        },
      },
      country: Countries.GERMANY,
    },
    update: {},
  });

  console.log(`Cinema with name ${cinema.name} created`);
});

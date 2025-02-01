import { ArrayHelper } from "@ainias42/js-helper";
import { db } from "@waslaeuftin/server/db";
import { xior } from "xior";

const xiorClient = xior.create();

const { data: cinemas } = await xiorClient.get<
  {
    id: number;
    name: string;
    city: string;
  }[]
>("https://www.cinestar.de/api/cinema/");

await ArrayHelper.asyncForEach(cinemas, async (cinema) => {
  let city = await db.city.findFirst({
    where: {
      name: cinema.city,
    },
  });

  if (!city) {
    city = await db.city.create({
      data: {
        name: cinema.city,
        slug: cinema.city.toLowerCase().replace(/\s/g, "_"),
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
      cineStarCinemaId: cinema.id,
    },
  });

  console.log(`Cinema with name ${cinema.name} created`);
});

import { ArrayHelper } from "@ainias42/js-helper";
import cinemas from "./myvue-cinemas-updated.json";
import { db } from "@waslaeuftin/server/db";
import { Country } from "@prisma/client";

await ArrayHelper.asyncForEach(
  cinemas.result.flatMap((letter) => letter.cinemas),
  async (cinema) => {
    const city = await db.city.findFirst({
      where: {
        name: cinema.city,
      },
    });

    await db.cinema.create({
      data: {
        name: cinema.fullName,
        slug: cinema.fullName.toLowerCase().replace(/\s/g, "_"),
        city: !!city
          ? { connect: { id: city.id } }
          : {
              create: {
                name: cinema.city,
                slug: cinema.city.toLowerCase().replace(/\s/g, "_"),
                country:
                  cinema.country === "United Kingdom" ? Country.UK : Country.IE,
              },
            },
        myVueCinemaId: cinema.cinemaId,
      },
    });
  },
);

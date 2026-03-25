import { Countries } from "@prisma/client";
import { db } from "@waslaeuftin/server/db";
import readline from "readline";

const readLine = async (promt: string) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return await new Promise<string>((resolve) => {
    rl.question(promt, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
};

const cityName = await readLine("City Name: ");

const foundCity = await db.city.upsert({
  where: {
    name: cityName,
  },
  create: {
    name: cityName,
    slug: cityName.toLowerCase().replace(/\s/g, "_"),
    country: Countries.GERMANY,
  },
  update: {},
});

console.log(`City with name ${cityName} upserted`);

const cinemaName = await readLine("Cinema Name: ");

const cinemaType = await readLine(
    "Cinema Type (1 kino-ticket-express, 2 kinoheld, 3 comtrada, 4 cinemaxx-vue, 5 premiumkino, 6 cinestar): ",
  );

  switch (cinemaType) {
    case "1":
      const slug = (await readLine("Center Slug: ")).replaceAll(
        "https://kinotickets.express/",
        "",
      );

      await db.cinema.upsert({
        where: {
          cityId_slug: {
            cityId: foundCity.id,
            slug,
          },
        },
        create: {
          name: cinemaName,
          slug,
          city: {
            connect: {
              id: foundCity.id,
            },
          },
          isKinoTicketsExpress: true,
          country: Countries.GERMANY,
        },
        update: {},
      });

      break;
    case "2":
      const centerId = await readLine("Center ID: ");
      const centerShorty = await readLine("Center Shorty: ");

      await db.cinema.upsert({
        where: {
          cityId_slug: {
            cityId: foundCity.id,
            slug: cinemaName.toLowerCase().replace(/\s/g, "_"),
          },
        },
        create: {
          name: cinemaName,
          slug: cinemaName.toLowerCase().replace(/\s/g, "_"),
          city: {
            connect: {
              id: foundCity.id,
            },
          },
          kinoHeldCinemasMetadata: {
            create: {
              centerId,
              centerShorty,
            },
          },
          country: Countries.GERMANY,
        },
        update: {},
      });
      break;

    case "4":
      const cinemaId = await readLine("Cinema ID: ");

      if (Number.isNaN(Number(cinemaId))) {
        console.error("Cinema ID is not a number");
        process.exit(1);
      }

      await db.cinema.upsert({
        where: {
          cityId_slug: {
            cityId: foundCity.id,
            slug: cinemaName.toLowerCase().replace(/\s/g, "_"),
          },
        },
        create: {
          name: cinemaName,
          slug: cinemaName.toLowerCase().replace(/\s/g, "_"),
          city: {
            connect: {
              id: foundCity.id,
            },
          },
          cinemaxxVueCinemasMetadata: {
            create: {
              cinemaId: Number(cinemaId),
            },
          },
          country: Countries.GERMANY,
        },
        update: {},
      });
      break;

    case "5":
      const subdomain = await readLine("Subdomain: ");

      await db.cinema.upsert({
        where: {
          cityId_slug: {
            cityId: foundCity.id,
            slug: cinemaName.toLowerCase().replace(/\s/g, "_"),
          },
        },
        create: {
          name: cinemaName,
          slug: cinemaName.toLowerCase().replace(/\s/g, "_"),
          city: {
            connect: {
              id: foundCity.id,
            },
          },
          premiumKinoSubdomain: subdomain,
          country: Countries.GERMANY,
        },
        update: {},
      });
      break;

    case "6":
      const cinestarCinemaId = await readLine("Cinestar Cinema ID: ");

      if (Number.isNaN(Number(cinestarCinemaId))) {
        console.error("Cinestar Cinema ID is not a number");
        process.exit(1);
      }

      await db.cinema.upsert({
        where: {
          cityId_slug: {
            cityId: foundCity.id,
            slug: cinemaName.toLowerCase().replace(/\s/g, "_"),
          },
        },
        create: {
          name: cinemaName,
          slug: cinemaName.toLowerCase().replace(/\s/g, "_"),
          city: {
            connect: {
              id: foundCity.id,
            },
          },
          isKinoTicketsExpress: true,
          cineStarCinemaId: Number(cinestarCinemaId),
          country: Countries.GERMANY,
        },
        update: {},
      });
      break;

    default:
      console.error("Anything besides kinoheld is not supported yet");
      process.exit(1);
  }

console.log(`Cinema with name ${cinemaName} upserted`);

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

let foundCity = await db.city.findFirst({
  where: {
    name: cityName,
  },
});

if (!foundCity) {
  foundCity = await db.city.create({
    data: {
      name: cityName,
      slug: cityName.toLowerCase().replace(/\s/g, "_"),
    },
  });

  console.log(`City with name ${cityName} created`);
} else {
  console.log(`City with name ${cityName} already exists`);
}

const cinemaName = await readLine("Cinema Name: ");

const foundCinema = await db.cinema.findFirst({
  where: {
    name: cinemaName,
    city: {
      name: cityName,
    },
  },
});

if (!foundCinema) {
  const cinemaType = await readLine(
    "Cinema Type (1 kino-ticket-express, 2 kinoheld, 3 comtrada, 4 cinemaxx-vue, 5 premiumkino, 6 cinestar): ",
  );

  switch (cinemaType) {
    case "1":
      const slug = (await readLine("Center Slug: ")).replaceAll(
        "https://kinotickets.express/",
        "",
      );

      await db.cinema.create({
        data: {
          name: cinemaName,
          slug,
          city: {
            connect: {
              id: foundCity?.id,
            },
          },
          isKinoTicketsExpress: true,
        },
      });

      break;
    case "2":
      const centerId = await readLine("Center ID: ");
      const centerShorty = await readLine("Center Shorty: ");

      await db.cinema.create({
        data: {
          name: cinemaName,
          slug: cinemaName.toLowerCase().replace(/\s/g, "_"),
          city: {
            connect: {
              id: foundCity?.id,
            },
          },
          kinoHeldCinemasMetadata: {
            create: {
              centerId,
              centerShorty,
            },
          },
        },
      });
      break;

    case "4":
      const cinemaId = await readLine("Cinema ID: ");

      if (Number.isNaN(Number(cinemaId))) {
        console.error("Cinema ID is not a number");
        process.exit(1);
      }

      await db.cinema.create({
        data: {
          name: cinemaName,
          slug: cinemaName.toLowerCase().replace(/\s/g, "_"),
          city: {
            connect: {
              id: foundCity?.id,
            },
          },
          cinemaxxVueCinemasMetadata: {
            create: {
              cinemaId: Number(cinemaId),
            },
          },
        },
      });
      break;

    case "5":
      const subdomain = await readLine("Subdomain: ");

      await db.cinema.create({
        data: {
          name: cinemaName,
          slug: cinemaName.toLowerCase().replace(/\s/g, "_"),
          city: {
            connect: {
              id: foundCity?.id,
            },
          },
          premiumKinoSubdomain: subdomain,
        },
      });
      break;

    case "6":
      const cinestarCinemaId = await readLine("Cinestar Cinema ID: ");

      if (Number.isNaN(Number(cinestarCinemaId))) {
        console.error("Cinestar Cinema ID is not a number");
        process.exit(1);
      }

      await db.cinema.create({
        data: {
          name: cinemaName,
          slug: cinemaName.toLowerCase().replace(/\s/g, "_"),
          city: {
            connect: {
              id: foundCity?.id,
            },
          },
          isKinoTicketsExpress: true,
          cineStarCinemaId: Number(cinestarCinemaId),
        },
      });
      break;

    default:
      console.error("Anything besides kinoheld is not supported yet");
      process.exit(1);
  }

  console.log(`Cinema with name ${cinemaName} created`);
} else {
  console.log(`Cinema with name ${cinemaName} already exists`);
}

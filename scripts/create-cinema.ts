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
    "Cinema Type (1 kino-ticket-express, 2 kinoheld, 3 comtrada): ",
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
    default:
      console.error("Anything besides kinoheld is not supported yet");
      process.exit(1);
      break;
  }

  console.log(`Cinema with name ${cinemaName} created`);
} else {
  console.log(`Cinema with name ${cinemaName} already exists`);
}

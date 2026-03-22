import { db } from "@waslaeuftin/server/db";

const LOOKBACK_MONTHS = 2;

const args = new Set(process.argv.slice(2));
const shouldDeleteNeverShown = args.has("--delete-never-shown");

const cutoffDate = new Date();
cutoffDate.setMonth(cutoffDate.getMonth() - LOOKBACK_MONTHS);

const cinemas = await db.cinema.findMany({
  where: {
    movies: {
      none: {
        showings: {
          some: {
            dateTime: {
              gte: cutoffDate,
            },
          },
        },
      },
    },
  },
  select: {
    id: true,
    name: true,
    slug: true,
    city: {
      select: {
        name: true,
      },
    },
    movies: {
      select: {
        showings: {
          orderBy: {
            dateTime: "desc",
          },
          take: 1,
          select: {
            dateTime: true,
          },
        },
      },
    },
  },
  orderBy: [{ city: { name: "asc" } }, { name: "asc" }],
});

console.log(
  `Cinemas without showings newer than ${cutoffDate.toISOString()} (lookback: ${LOOKBACK_MONTHS} months): ${cinemas.length}`,
);

for (const cinema of cinemas) {
  const latestShowing = cinema.movies
    .flatMap((movie) => movie.showings)
    .sort((left, right) => right.dateTime.getTime() - left.dateTime.getTime())[0];

  const latestShowingLabel = latestShowing
    ? latestShowing.dateTime.toISOString()
    : "none";

  console.log(
    `[${cinema.id}] ${cinema.name} (${cinema.city.name}) slug=${cinema.slug} latestShowing=${latestShowingLabel}`,
  );
}

const neverShownCinemas = cinemas.filter((cinema) =>
  cinema.movies.every((movie) => movie.showings.length === 0),
);

console.log(`\nNever had any showings: ${neverShownCinemas.length}`);

if (shouldDeleteNeverShown) {
  if (neverShownCinemas.length === 0) {
    console.log("Nothing to delete.");
  } else {
    const cinemaIdsToDelete = neverShownCinemas.map((cinema) => cinema.id);

    const deleteResult = await db.cinema.deleteMany({
      where: {
        id: {
          in: cinemaIdsToDelete,
        },
      },
    });

    console.log(
      `Deleted cinemas that never had showings: ${deleteResult.count}/${cinemaIdsToDelete.length}`,
    );
  }
} else if (neverShownCinemas.length > 0) {
  console.log("Use --delete-never-shown to delete these cinemas.");
}

await db.$disconnect();

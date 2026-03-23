import { db } from "@waslaeuftin/server/db";

const main = async () => {
  console.info("[ResetCinemaFetchDates] Resetting lastFetchedAt for all cinemas...");

  const result = await db.cinema.updateMany({
    data: {
      lastFetchedAt: null,
    },
  });

  console.info(
    `[ResetCinemaFetchDates] Successfully reset lastFetchedAt for ${result.count} cinemas`,
  );
};

main()
  .catch((error) => {
    console.error("[ResetCinemaFetchDates] Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

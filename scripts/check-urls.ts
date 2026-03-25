import { db } from "@waslaeuftin/server/db";

async function main() {
    const result = await db.$queryRaw<
        { provider: string; count: number }[]
    >`
    SELECT
      CASE
        WHEN c."comtradaCineOrderMetadataId" IS NOT NULL THEN 'Comtrada'
        WHEN c."isKinoTicketsExpress" = true THEN 'KinoTicketsExpress'
        WHEN c."kinoHeldCinemasMetadataId" IS NOT NULL THEN 'Kinoheld'
        WHEN c."cinemaxxVueCinemasMetadataId" IS NOT NULL THEN 'Cinemaxx/Vue'
        WHEN c."premiumKinoSubdomain" IS NOT NULL THEN 'PremiumKino'
        WHEN c."cineStarCinemaId" IS NOT NULL THEN 'CineStar'
        WHEN c."cineplexCinemaId" IS NOT NULL THEN 'Cineplex'
        WHEN c."cineplexxAtCinemaId" IS NOT NULL THEN 'Cineplexx AT'
        WHEN c."myVueCinemaId" IS NOT NULL THEN 'MyVue'
        ELSE 'Unknown'
      END AS provider,
      COUNT(*)::int AS count
    FROM "Showing" s
    INNER JOIN "Cinema" c ON c.id = s."cinemaId"
    WHERE
      s."bookingUrl" IS NULL
      OR LENGTH(s."bookingUrl") < 15
    GROUP BY provider
    ORDER BY count DESC;
  `;

    console.table(result);
}

main()
    .catch((err) => {
        console.error('Error running query:', err);
        process.exit(1);
    })
    .finally(() => process.exit())

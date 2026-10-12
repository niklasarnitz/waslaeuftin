import { db } from "@waslaeuftin/db/client";

// Preserve cinemas that own screening history; only remove empty ones.
const cineplexxAtCinemas = await db.cinema.findMany({
  where: { cineplexxAtCinemaId: { not: null } },
  select: { id: true, name: true, cityId: true },
});

console.log(
  `Found ${cineplexxAtCinemas.length} CineplexxAT cinemas to clean up`,
);

const deletedCinemas = await db.cinema.deleteMany({
  where: { cineplexxAtCinemaId: { not: null }, showings: { none: {} } },
});
console.log(
  `Deleted ${deletedCinemas.count} empty cinemas; retained ${cineplexxAtCinemas.length - deletedCinemas.count} cinemas with screening history`,
);

// Clean up orphaned Austrian cities (no cinemas left).
const orphanedCities = await db.city.findMany({
  where: {
    country: "AUSTRIA",
    cinemas: { none: {} },
  },
  select: { id: true, name: true },
});

if (orphanedCities.length > 0) {
  console.log(
    `Deleting ${orphanedCities.length} orphaned Austrian cities: ${orphanedCities.map((c) => c.name).join(", ")}`,
  );
  await db.city.deleteMany({
    where: { id: { in: orphanedCities.map((c) => c.id) } },
  });
}

console.log("Cleanup done.");
process.exit();

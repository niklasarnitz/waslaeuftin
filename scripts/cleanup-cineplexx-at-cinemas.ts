import { db } from "@waslaeuftin/server/db";

// 1. Delete all showings for CineplexxAT cinemas
const cineplexxAtCinemas = await db.cinema.findMany({
    where: { cineplexxAtCinemaId: { not: null } },
    select: { id: true, name: true, cityId: true },
});

console.log(`Found ${cineplexxAtCinemas.length} CineplexxAT cinemas to clean up`);

const cinemaIds = cineplexxAtCinemas.map((c) => c.id);

const deletedShowings = await db.showing.deleteMany({
    where: { cinemaId: { in: cinemaIds } },
});
console.log(`Deleted ${deletedShowings.count} showings`);

// 2. Delete the cinemas themselves
const deletedCinemas = await db.cinema.deleteMany({
    where: { cineplexxAtCinemaId: { not: null } },
});
console.log(`Deleted ${deletedCinemas.count} cinemas`);

// 3. Clean up orphaned Austrian cities (no cinemas left)
const orphanedCities = await db.city.findMany({
    where: {
        country: "AUSTRIA",
        cinemas: { none: {} },
    },
    select: { id: true, name: true },
});

if (orphanedCities.length > 0) {
    console.log(`Deleting ${orphanedCities.length} orphaned Austrian cities: ${orphanedCities.map((c) => c.name).join(", ")}`);
    await db.city.deleteMany({
        where: { id: { in: orphanedCities.map((c) => c.id) } },
    });
}

console.log("Cleanup done.");
process.exit();

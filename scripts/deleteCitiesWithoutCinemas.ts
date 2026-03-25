import { db } from "@waslaeuftin/server/db";

const citiesWithoutCinemas = await db.city.findMany({
    where: {
        cinemas: {
            none: {}
        }
    }
})

await db.city.deleteMany({
    where: {
        id: {
            in: citiesWithoutCinemas.map(c => c.id)
        }
    }
})

process.exit();

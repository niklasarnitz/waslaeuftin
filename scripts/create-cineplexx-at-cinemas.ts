import { Countries } from "@prisma/client";
import { CineplexxATCinema } from "@waslaeuftin/cinemaProviders/cineplex-at/types/CineplexxATCinema";
import { db } from "@waslaeuftin/server/db";

const cinemasRaw = await fetch('https://app.cineplexx.at/api/v1/cinemas')
const cinemasData = await cinemasRaw.json() as CineplexxATCinema[];

const extractCityName = (input: string) => {
    // address2 has format "[PLZ] CityName", e.g. "1060 Wien", "8020 Graz"
    return input.replace(/^\d+\s*/, "").trim();
}

const toSlug = (name: string) => {
    return name.toLowerCase().replace(/\s+/g, "_");
}

// Deduplicate cities by name
const cityNamesSet = new Set<string>();
for (const c of cinemasData) {
    const cityName = extractCityName(c.city ?? c.address2);
    cityNamesSet.add(cityName);
}

const createdCities = await Promise.all(
    Array.from(cityNamesSet).map((cityName) => {
        const slug = toSlug(cityName);
        return db.city.upsert({
            where: { slug },
            create: {
                name: cityName,
                slug,
                country: Countries.AUSTRIA,
            },
            update: {},
        });
    })
);

console.log(`Created or updated ${createdCities.length} cities`);

const createdCinemas = await Promise.all(
    cinemasData.map(async (c) => {
        const cityName = extractCityName(c.city ?? c.address2);
        const citySlug = toSlug(cityName);

        const foundCity = await db.city.findUnique({
            where: { slug: citySlug },
        });

        if (!foundCity) {
            throw new Error(`City not found for cinema ${c.name}: ${cityName}`);
        }

        const cinemaSlug = toSlug(c.name);

        return db.cinema.upsert({
            where: {
                cityId_slug: {
                    cityId: foundCity.id,
                    slug: cinemaSlug,
                },
            },
            create: {
                cityId: foundCity.id,
                slug: cinemaSlug,
                name: c.name,
                latitude: c.geo.latitude,
                longitude: c.geo.longitude,
                cineplexxAtCinemaId: c.id,
                country: Countries.AUSTRIA,
            },
            update: {
                name: c.name,
                latitude: c.geo.latitude,
                longitude: c.geo.longitude,
                cineplexxAtCinemaId: c.id,
            },
        });
    })
);

console.log(`Created or updated ${createdCinemas.length} cinemas`);

process.exit();

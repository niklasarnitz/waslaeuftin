import { Countries } from "@prisma/client";
import { getCinfinityCinemas } from "@waslaeuftin/cinemaProviders/cinfinity/getCinfinityCinemas";
import { db } from "@waslaeuftin/server/db";

const toSlug = (name: string) => name.toLowerCase().replace(/\s+/g, "_");

const cinemas = await getCinfinityCinemas();

const cityNames = new Set(cinemas.map((cinema) => cinema.city.trim()));

const upsertCity = async (cityName: string) => {
    const slug = toSlug(cityName);
    const existingCity = await db.city.findFirst({
        where: {
            OR: [{ name: cityName }, { slug }],
        },
    });

    if (existingCity) return existingCity;

    return db.city.create({
        data: {
            name: cityName,
            slug,
            country: Countries.GERMANY,
        },
    });
};

const cityEntries = await Promise.all(
    Array.from(cityNames).map(async (cityName) => [cityName, await upsertCity(cityName)] as const),
);

const citiesByName = new Map(cityEntries);

const createdCinemas = await Promise.all(
    cinemas.map((cinema) => {
        const cityName = cinema.city.trim();
        const city = citiesByName.get(cityName);

        if (!city) {
            throw new Error(`City not found for Cinfinity cinema ${cinema.name}: ${cityName}`);
        }

        return db.cinema.upsert({
            where: {
                cityId_slug: {
                    cityId: city.id,
                    slug: toSlug(cinema.name),
                },
            },
            create: {
                name: cinema.name,
                slug: toSlug(cinema.name),
                cityId: city.id,
                latitude: cinema.location?.latitude,
                longitude: cinema.location?.longitude,
                cinfinityCinemaId: cinema.id,
                country: Countries.GERMANY,
            },
            update: {
                name: cinema.name,
                latitude: cinema.location?.latitude,
                longitude: cinema.location?.longitude,
                cinfinityCinemaId: cinema.id,
            },
        });
    }),
);

console.log(`Created or updated ${createdCinemas.length} Cinfinity cinemas`);

await db.$disconnect();

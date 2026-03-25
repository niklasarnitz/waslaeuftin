import { ArrayHelper } from "@ainias42/js-helper";
import { Countries } from "@prisma/client";
import { db } from "@waslaeuftin/server/db";
import xior from "xior";

const xiorClient = xior.create();

const { data: cinemas } = await xiorClient.get<
    {
        id: number;
        name: string;
        city: string;
        cinemaNumber: number;
    }[]
>("https://www.cinestar.de/api/cinema/");

await ArrayHelper.asyncForEach(cinemas, async (cinema) => {
    const city = await db.city.upsert({
        where: {
            name: cinema.city,
        },
        create: {
            name: cinema.city,
            slug: cinema.city.toLowerCase().replace(/\s/g, "_"),
            country: Countries.GERMANY,
        },
        update: {},
    });

    await db.cinema.upsert({
        where: {
            cityId_slug: {
                cityId: city.id,
                slug: cinema.name.toLowerCase().replace(/\s/g, "_"),
            },
        },
        create: {
            name: cinema.name,
            slug: cinema.name.toLowerCase().replace(/\s/g, "_"),
            city: {
                connect: {
                    id: city.id,
                },
            },
            cineStarCinemaId: cinema.id,
            cineStarCinemaNumber: cinema.cinemaNumber,
            country: Countries.GERMANY,
        },
        update: {
            cineStarCinemaNumber: cinema.cinemaNumber
        },
    });

    console.log(`Cinema with name ${cinema.name} created`);
});

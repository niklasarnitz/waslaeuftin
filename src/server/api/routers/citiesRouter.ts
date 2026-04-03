import {
    createTRPCRouter,
    publicProcedure,
} from "@waslaeuftin/server/api/trpc";
import { trackCinemaView, trackCityView } from "@waslaeuftin/server/umami";
import moment from "moment-timezone";
import { z } from "zod";

export const citiesRouter = createTRPCRouter({
    getCityBySlug: publicProcedure
        .input(z.string())
        .query(async ({ input, ctx }) => {
            const city = await ctx.db.city.findUnique({
                where: {
                    slug: input,
                },
            });

            if (city) {
                void trackCityView(city, ctx.ip);
            }

            return city;
        }),
    getCities: publicProcedure
        .input(z.string().optional())
        .query(async ({ ctx, input }) => {
            const normalizedQuery = input?.trim();

            const cities = await ctx.db.city.findMany({
                where: normalizedQuery
                    ? {
                        OR: [
                            { name: { contains: normalizedQuery, mode: "insensitive" } },
                            {
                                cinemas: {
                                    some: {
                                        name: { contains: normalizedQuery, mode: "insensitive" },
                                    },
                                },
                            },
                        ],
                    }
                    : undefined,
                include: {
                    cinemas: {
                        where: normalizedQuery
                            ? {
                                OR: [
                                    {
                                        name: { contains: normalizedQuery, mode: "insensitive" },
                                    },
                                    {
                                        city: {
                                            name: {
                                                contains: normalizedQuery,
                                                mode: "insensitive",
                                            },
                                        },
                                    },
                                ],
                            }
                            : undefined,
                        select: {
                            name: true,
                            slug: true,
                            id: true,
                        },
                        orderBy: { name: "asc" },
                    },
                    _count: {
                        select: {
                            cinemas: true,
                        },
                    },
                },
                orderBy: { name: "asc" },
            });

            if (cities) {
                void trackCityView(cities, ctx.ip)
            }

            return cities;
        }),
    getCityMoviesAndShowingsBySlug: publicProcedure
        .input(
            z.object({
                slug: z.string(),
                date: z.date().optional(),
            }),
        )
        .query(async ({ input, ctx }) => {
            let { date } = input;

            date ??= new Date();

            // Use moment to ensure correct day boundaries in UTC
            const start = moment(date).startOf("day").toDate();
            const end = moment(date).endOf("day").toDate();

            const showingsFilter = {
                dateTime: {
                    gte: start,
                    lte: end,
                },
            };

            const city = await ctx.db.city.findUnique({
                where: {
                    slug: input.slug,
                },
                include: {
                    cinemas: {
                        orderBy: {
                            name: "asc",
                        },
                        include: {
                            showings: {
                                where: showingsFilter,
                                orderBy: {
                                    dateTime: "asc",
                                },
                                include: {
                                    movie: {
                                        select: {
                                            id: true,
                                            name: true,
                                            coverUrl: true,
                                            tmdbMetadata: {
                                                select: {
                                                    popularity: true,
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            });

            if (!city) {
                return null;
            }

            if (city.cinemas) {
                void trackCityView(city, ctx.ip);
                void trackCinemaView(city.cinemas, ctx.ip);
            }

            // Transform to preserve the movies[] shape per cinema for the frontend
            return {
                ...city,
                cinemas: city.cinemas.map((cinema) => {
                    const movieMap: Record<
                        number,
                        {
                            name: string;
                            coverUrl: string | null;
                            tmdbMetadata: { popularity: number | null } | null;
                            showings: typeof cinema.showings;
                        }
                    > = {};

                    for (const showing of cinema.showings) {
                        const existing = movieMap[showing.movie.id];
                        if (existing !== undefined) {
                            existing.showings.push(showing);
                        } else {
                            movieMap[showing.movie.id] = {
                                name: showing.movie.name,
                                coverUrl: showing.movie.coverUrl,
                                tmdbMetadata: showing.movie.tmdbMetadata,
                                showings: [showing],
                            };
                        }
                    }

                    const movies = Object.values(movieMap)
                        .filter((movie) => movie.showings.length > 0)
                        .sort((a, b) => a.name.localeCompare(b.name));

                    const { showings: _showings, ...cinemaWithoutShowings } = cinema;

                    return {
                        ...cinemaWithoutShowings,
                        movies,
                    };
                }),
            };
        }),

    search: publicProcedure
        .input(z.string())
        .query(async ({ ctx, input }) => {
            const query = input.trim();

            const cityWhere = query
                ? { name: { contains: query, mode: "insensitive" as const } }
                : undefined;

            const cinemaWhere = query
                ? { name: { contains: query, mode: "insensitive" as const } }
                : undefined;

            const cities = await ctx.db.city.findMany({
                where: cityWhere,
                select: { id: true, name: true, slug: true },
                orderBy: { name: "asc" },
                take: 5,
            });

            const cinemas = await ctx.db.cinema.findMany({
                where: cinemaWhere,
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    city: { select: { name: true } },
                },
                orderBy: { name: "asc" },
                take: 5,
            });

            return { cities, cinemas };
        }),
    getCityById: publicProcedure
        .input(z.number())
        .query(async ({ input, ctx }) => {
            const city = await ctx.db.city.findFirst({
                where: {
                    id: input,
                },
            });

            if (city) {
                void trackCityView(city, ctx.ip)
            }

            return city;
        }),
});

import moment from "moment-timezone";

import { queryCinfinity } from "./getCinfinityCinemas";

type CinfinityScreening = {
    datetime: string | null;
    onlineTicketingId: string | null;
    isInfoOnly: boolean | null;
    auditoriumName: string | null;
    movie: {
        title: string | null;
    } | null;
    cinema: {
        id: string;
        onlineTicketingBaseUrl: string | null;
        onlineReservationBaseUrl: string | null;
        website: string | null;
    } | null;
    attributes: {
        label: string | null;
    }[];
};

const CINFINITY_SCREENINGS_QUERY = `
    query CinfinityScreenings($cinemaIds: [ID!], $after: DateTime, $before: DateTime) {
        screenings(cinemaIds: $cinemaIds, after: $after, before: $before) {
            datetime
            onlineTicketingId
            isInfoOnly
            auditoriumName
            movie {
                title
            }
            cinema {
                id
                onlineTicketingBaseUrl
                onlineReservationBaseUrl
                website
            }
            attributes {
                label
            }
        }
    }
`;

const getBookingUrl = (screening: CinfinityScreening) => {
    const onlineTicketingId = screening.onlineTicketingId?.trim();
    if (!onlineTicketingId) return null;

    const baseUrl =
        screening.cinema?.onlineTicketingBaseUrl ??
        screening.cinema?.onlineReservationBaseUrl ??
        screening.cinema?.website;

    if (!baseUrl) return null;

    try {
        const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
        return new URL(onlineTicketingId, normalizedBaseUrl).toString();
    } catch {
        return null;
    }
};

export const getCinfinityMovies = async (
    cinemas: {
        cinemaId: number;
        cinfinityCinemaId: string;
    }[],
) => {
    const data = await queryCinfinity<{ screenings: CinfinityScreening[] }>(
        CINFINITY_SCREENINGS_QUERY,
        {
            cinemaIds: cinemas.map((cinema) => cinema.cinfinityCinemaId),
            after: moment().subtract(1, "day").toISOString(),
            before: moment().add(14, "days").toISOString(),
        },
    );

    const cinemasByCinfinityCinemaId: Record<string, (typeof cinemas)[number]> = {};
    for (const cinema of cinemas) {
        cinemasByCinfinityCinemaId[cinema.cinfinityCinemaId] = cinema;
    }

    const showings = data.screenings
        .map((screening) => {
            const cinema = screening.cinema ? cinemasByCinfinityCinemaId[screening.cinema.id] : undefined;
            const movieName = screening.movie?.title?.trim();

            if (!cinema || !movieName || !screening.datetime || screening.isInfoOnly === true) {
                return null;
            }

            return {
                cinemaId: cinema.cinemaId,
                movieName,
                dateTime: moment(screening.datetime).toDate(),
                bookingUrl: getBookingUrl(screening),
                showingAdditionalData: [
                    screening.auditoriumName,
                    ...screening.attributes.map((attribute) => attribute.label),
                ].filter((value): value is string => typeof value === "string" && value.length > 0),
            };
        })
        .filter((showing): showing is NonNullable<typeof showing> => showing !== null);

    const movies = showings.map((showing) => ({
        name: showing.movieName,
        cinemaId: showing.cinemaId,
    }));

    return { movies, showings };
};

import {
    type CineStarEventType,
    type CineStarAttribute,
} from "@waslaeuftin/cinemaProviders/cinestar/CinestarTypes";
import xior from "xior";
import { ArrayHelper, type URecord } from "@ainias42/js-helper";
import moment from "moment-timezone";


const parseCineStarDateTime = (dateTime: string): Date => {
    const normalizedDateTime = dateTime.replace(/\s+(?:CET|CEST)$/, "");
    const parsedDateTime = moment.tz(
        normalizedDateTime,
        "YYYY-MM-DD HH:mm",
        true,
        "Europe/Berlin",
    );

    if (!parsedDateTime.isValid()) {
        throw new Error(`Invalid CineStar showtime datetime: ${dateTime}`);
    }

    return parsedDateTime.toDate();
};

export const getCineStarMovies = async (
    cinemaId: number,
    cinestarCinemaId: number,
) => {
    const xiorInstance = xior.create();

    const { data: rawAttributes } = await xiorInstance.get<CineStarAttribute[]>(
        "https://www.cinestar.de/api/attribute",
    );

    if (!rawAttributes) {
        throw new Error("Could not load CineStar attributes");
    }

    const attributes: URecord<string, CineStarAttribute> = {};
    for (const attribute of rawAttributes) {
        if (attribute.name && attribute.name.length > 0) {
            attributes[attribute.id] = attribute;
        }
    }

    const { data } = await xiorInstance.get<CineStarEventType[]>(
        `https://www.cinestar.de/api/cinema/${cinestarCinemaId}/show/`,
    );

    if (!data) {
        throw new Error("Could not load CineStar movies");
    }

    const movies = data.map(
        (movie) =>
        ({
            name: movie.title,
            cinemaId,
        }),
    );

    const showings = data.map((movie) =>
        movie.showtimes.map(
            (showtime) =>
            ({
                cinemaId,
                movieName: movie.title,
                dateTime: parseCineStarDateTime(showtime.datetime),
                bookingUrl: `https://webticketing3.cinestar.de/?cinemaId=${cinestarCinemaId}&movieSessionId=120216`,
                showingAdditionalData: ArrayHelper.noUndefined(
                    showtime.attributes.map((attribute) => attributes[attribute]),
                )
                    .map((attribute) => attribute.name)
                    .filter((name): name is string => typeof name === "string" && name.length > 0),
            }),
        ),
    );

    return {
        movies,
        showings,
    };
};

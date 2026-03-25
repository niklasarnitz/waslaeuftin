import { Xior } from "xior";
import { CineplexxATMovie } from "./types/CineplexxATMovie";
import { Showing } from "@waslaeuftin/types/Showing";
import moment from "moment-timezone";
import { ArrayHelper } from "@ainias42/js-helper";
import { RawProviderShowing } from "@waslaeuftin/types/RawProviderShowing";

export const getCineplexxATMovies = async (
    cinemaId: number,
    cineplexxATCinemaId: string,
) => {
    const xiorInstance = Xior.create();

    const { data: availableDates } = await xiorInstance.get<string[]>(
        'https://app.cineplexx.at/api/v2/movies/filters/dates/list?location=all'
    )


    const data = (await Promise.all(availableDates.flatMap(date => xiorInstance.get<CineplexxATMovie[]>(
        `https://app.cineplexx.at/api/v1/cinemasweb/${cineplexxATCinemaId}/movies?date=${moment(date).format('YYYY-MM-DD')}`,
    )))).flatMap(r => r.data)

    if (!data) {
        throw new Error("Could not load Cineplexx AT movies");
    }

    const movies = data.map(
        (movie) =>
        ({
            name: movie.titleCalculated ?? movie.title.replaceAll("*", ""),
            cinemaId,
        }),
    );

    const showings = data.map((movie) =>
        movie.sessions.map(s => ({
            dateTime: moment(s.showtime).toDate(),
            bookingUrl: `https://cineplexx.at/purchase/wizard/${s.id}/tickets`,
            showingAdditionalData: Array.from(new Set(ArrayHelper.noUndefined([
                s.screenName,
                ...ArrayHelper.noUndefined(s.technologies.flatMap((t) => t.map(n => n)))
            ]))),
            cinemaId,
            movieName: movie.titleCalculated ?? movie.title.replaceAll("*", "")
        } satisfies RawProviderShowing))
    );

    return {
        movies,
        showings,
    };
};

import {
  type CinemaSlugs,
  Cinemas,
  type Movie,
} from "@waslaeuftin/types/Movie";
import moment from "moment";
import Link from "next/link";

export const MoviesByCinemaList = ({
  moviesByCinema,
  showFilterByToday,
  showRemoveFilter,
  city,
}: {
  moviesByCinema: Record<CinemaSlugs, Movie[]>;
  showFilterByToday?: boolean;
  showRemoveFilter?: boolean;
  city?: string;
}) => {
  return Object.keys(moviesByCinema).map((cinemaSlug) => {
    const moviesInCinema = moviesByCinema[cinemaSlug as CinemaSlugs];
    const cinema = Cinemas[cinemaSlug as CinemaSlugs];

    if (!cinema) {
      return null;
    }

    return (
      <div key={cinema.slug} className="space-y-4 p-4">
        <div className="flex flex-row items-center justify-between">
          <h1 className="text-2xl font-bold">{cinema.name}</h1>
          {showFilterByToday && (
            <div>
              <Link
                href={`/city/${city}/today`}
                className="rounded-lg border px-4 py-2 underline shadow-sm"
              >
                Heute
              </Link>
            </div>
          )}
          {showRemoveFilter && (
            <div>
              <Link
                href={`/city/${city}`}
                className="rounded-lg border px-4 py-2 underline shadow-sm"
              >
                X Heute
              </Link>
            </div>
          )}
        </div>
        {moviesInCinema.map((movie) => (
          <div key={movie.name}>
            <h2 className="text-lg font-semibold">{movie.name}</h2>
            <div className="grid grid-cols-6 gap-4">
              {movie.showings.map((showing) => {
                return (
                  <Link
                    href={showing.bookingUrl ?? "#"}
                    key={`${cinema.slug}-${showing.dateTime.toISOString()}-${movie.name}`}
                    className="flex flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-md hover:border-gray-300"
                  >
                    {moment(showing.dateTime).format("DD.MM.YYYY - HH:mm")}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  });
};

import { type api } from "@waslaeuftin/trpc/server";
import moment from "moment-timezone";
import Link from "next/link";

export type CinemaMoviesProps = {
  cinema: NonNullable<
    Awaited<ReturnType<typeof api.cities.getCityMoviesAndShowingsBySlug>>
  >["cinemas"][number];
};

export const CinemaMovies = ({ cinema }: CinemaMoviesProps) => {
  return (
    <>
      {cinema.movies.map((movie) => (
        <div key={`${cinema.slug}-${movie.name}`}>
          <h2 className="text-lg font-semibold">{movie.name}</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
            {movie.showings.map((showing) => {
              return (
                <Link
                  href={showing.bookingUrl ?? "#"}
                  key={`${cinema.slug}-${showing.dateTime.toISOString()}-${movie.name}`}
                  className="flex flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-md hover:border-gray-300"
                >
                  {moment(showing.dateTime).format("DD.MM.YYYY - HH:mm")}
                  {showing.showingAdditionalData && (
                    <div className="text-xs text-gray-500">
                      {showing.showingAdditionalData}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
};

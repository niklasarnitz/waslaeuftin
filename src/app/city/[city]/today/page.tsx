import { MoviesByCinemaList } from "@waslaeuftin/components/MoviesByCinemaList";
import { api } from "@waslaeuftin/trpc/server";
import moment from "moment-timezone";

export default async function MoviesInCity({
  params,
}: {
  params: { city?: string };
}) {
  if (!params.city) {
    return <div>Not found</div>;
  }

  const city = await api.cities.getCityMoviesAndShowingsBySlug({
    slug: params.city,
    date: moment().add(1, "hour").toDate(),
  });

  if (!city) {
    return <div>Not found</div>;
  }

  return <MoviesByCinemaList city={city} showRemoveFilter />;
}

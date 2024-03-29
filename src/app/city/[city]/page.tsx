import { MoviesByCinemaList } from "@waslaeuftin/components/MoviesByCinemaList";
import { api } from "@waslaeuftin/trpc/server";

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
  });

  if (!city) {
    return <div>Not found</div>;
  }

  return <MoviesByCinemaList city={city} showFilterByToday />;
}

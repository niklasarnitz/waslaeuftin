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

  return (
    <>
      <div className="flex flex-row items-center justify-between gap-x-2 px-4 pt-4">
        <h1 className="flex flex-1 text-2xl font-bold">
          Diese Filme laufen heute in {city.name}
        </h1>
      </div>
      <MoviesByCinemaList city={city} />
    </>
  );
}

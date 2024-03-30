import { CinemaMovies } from "@waslaeuftin/components/CinemaMovies";
import { api } from "@waslaeuftin/trpc/server";

export default async function CinemaPage({
  params,
}: {
  params: { cinemaSlug?: string };
}) {
  if (!params.cinemaSlug) {
    return <div>Not found</div>;
  }

  const cinema = await api.cinemas.getCinemaBySlug({
    cinemaSlug: params.cinemaSlug,
  });

  if (!cinema) {
    return <div>Not found</div>;
  }

  return (
    <div className="px-4">
      <div className="flex flex-row items-center justify-between gap-x-2 pt-4">
        <h1 className="flex flex-1 text-2xl font-bold">
          Diese Filme laufen heute im {cinema?.name}
        </h1>
      </div>
      <CinemaMovies cinema={cinema} />
    </div>
  );
}

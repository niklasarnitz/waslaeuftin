import { type NextRequest, NextResponse } from "next/server";
import { api } from "@waslaeuftin/trpc/server";

export async function GET(req: NextRequest) {
  const [
    cinemaxxVueMoviesCount,
    cineplexMoviesCount,
    cinestarMoviesCount,
    comtradaCineOrderMoviesCount,
    kinoHeldMoviesCount,
    kinoTicketsExpressMoviesCount,
    premiumKinoMoviesCount,
  ] = await Promise.all([
    api.movies.updateCinemaxxVueMovies({
      cronSecret: req.headers.get("x-cron-secret") ?? "",
    }),
    api.movies.updateCineplexMovies({
      cronSecret: req.headers.get("x-cron-secret") ?? "",
    }),
    api.movies.updateCineStarMovies({
      cronSecret: req.headers.get("x-cron-secret") ?? "",
    }),
    api.movies.updateComtradaCineOrderMovies({
      cronSecret: req.headers.get("x-cron-secret") ?? "",
    }),
    api.movies.updateKinoHeldMovies({
      cronSecret: req.headers.get("x-cron-secret") ?? "",
    }),
    api.movies.updateKinoTicketsExpressMovies({
      cronSecret: req.headers.get("x-cron-secret") ?? "",
    }),
    api.movies.updatePremiumKinoMovies({
      cronSecret: req.headers.get("x-cron-secret") ?? "",
    }),
  ]);

  return new NextResponse(
    JSON.stringify({
      message: `Movies were successfully updated.`,
      cinemaxxVueMoviesCount,
      cineplexMoviesCount,
      cinestarMoviesCount,
      comtradaCineOrderMoviesCount,
      kinoHeldMoviesCount,
      kinoTicketsExpressMoviesCount,
      premiumKinoMoviesCount,
    }),
  );
}

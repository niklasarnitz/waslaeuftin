import { type NextRequest, NextResponse } from "next/server";
import { api } from "@waslaeuftin/trpc/server";

export async function GET(req: NextRequest) {
  const {
    comtradaCineOrderMovies,
    comtradaForumCinemasMovies,
    kinoHeldCinemasMovies,
    kinoTicketsExpressCinemasMovies,
    cinemaxxVueCinemasMovies,
    premiumKinoCinemasMovies,
  } = await api.movies.updateMovies({
    cronSecret: req.headers.get("x-cron-secret") ?? "",
  });

  return new NextResponse(
    JSON.stringify({
      message: "Movies were successfully updated",
      comtradaCineOrderMoviesCount: comtradaCineOrderMovies.length,
      comtradaForumCinemasMoviesCount: comtradaForumCinemasMovies.length,
      kinoHeldCinemasMoviesCount: kinoHeldCinemasMovies.length,
      kinoTicketsExpressCinemasMoviesCount:
        kinoTicketsExpressCinemasMovies.length,
      cinemaxxVueCinemasMoviesCount: cinemaxxVueCinemasMovies.length,
      premiumKinoCinemasMoviesCount: premiumKinoCinemasMovies.length,
    }),
  );
}

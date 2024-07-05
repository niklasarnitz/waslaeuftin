import { type NextRequest, NextResponse } from "next/server";
import { api } from "@waslaeuftin/trpc/server";

export async function GET(req: NextRequest) {
  const { moviesCount } = await api.movies.updateMovies({
    cronSecret: req.headers.get("x-cron-secret") ?? "",
  });

  return new NextResponse(
    JSON.stringify({
      message: "Movies were successfully updated",
      moviesCount,
    }),
  );
}

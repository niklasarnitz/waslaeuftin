import { type NextRequest, NextResponse } from "next/server";
import { api } from "@waslaeuftin/trpc/server";
import { tryCatchRetry } from "@waslaeuftin/helpers/tryCatchRetry";

const getMovies = async (req: NextRequest) => {
  const moviesCount = await api.movies.updateCineStarMovies({
    cronSecret: req.headers.get("x-cron-secret") ?? "",
  });

  return new NextResponse(
    JSON.stringify({
      message: `${moviesCount} Movies were successfully updated from Cinestar`,
    }),
  );
};

export async function GET(req: NextRequest) {
  return await tryCatchRetry(() => getMovies(req));
}

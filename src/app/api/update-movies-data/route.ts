import { getComtradCineOrderMovies } from "@waslaeuftin/helpers/comtrada/cineorder/getComtradaCineOrderMovies";
import { getComtradaForumCinemasMovies } from "@waslaeuftin/helpers/comtrada/forum-cinemas/getComtradaForumCinemasMovies";
import { getKinoTicketsExpressMovies } from "@waslaeuftin/helpers/kino-ticket-express/getKinoTicketExpressMovies";
import { Cinemas } from "@waslaeuftin/types/Movie";
import { NextResponse } from "next/server";
import { xior } from "xior";

export const dynamic = "force-dynamic";
export const runtime = "edge";

export async function GET() {
  const movies = (
    await Promise.all([
      getComtradCineOrderMovies(Cinemas.zkm_karlsruhe),
      getKinoTicketsExpressMovies("karlsruhe_kinemathek"),
      getKinoTicketsExpressMovies("karlsruhe_schauburg"),
      getComtradaForumCinemasMovies("forum_lahr"),
      getComtradaForumCinemasMovies("forum_offenburg"),
      getComtradaForumCinemasMovies("forum_rastatt"),
    ])
  ).flat();

  await Promise.all(
    movies.map(async (movie) => {
      const xiorInstance = xior.create();

      await xiorInstance.post("https://waslaeuft.in/api/create-movie", movie);
    }),
  );

  return new NextResponse(
    JSON.stringify({ message: "Movies were successfully updated" }),
  );
}

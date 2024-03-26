import { KinoTicketsExpressCinemas } from "@waslaeuftin/server/api/routers/kino-tickets-express-router";
import { api } from "@waslaeuftin/trpc/server";
import { NextResponse } from "next/server";

export const GET = async () => {
  const movies = await api.kinoTicketsExpress.getMovies(
    KinoTicketsExpressCinemas.Values.karlsruhe_kinemathek,
  );

  return new NextResponse(JSON.stringify(movies));
};

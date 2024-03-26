import { api } from "@waslaeuftin/trpc/server";
import { KinoTicketsExpressCinemas } from "@waslaeuftin/types/Movie";
import { NextResponse } from "next/server";

export const GET = async () => {
  const movies = await api.kinoTicketsExpress.getMovies(
    KinoTicketsExpressCinemas.Values.karlsruhe_kinemathek,
  );

  return new NextResponse(JSON.stringify(movies));
};

import { api } from "@waslaeuftin/trpc/server";
import { Cinemas } from "@waslaeuftin/types/Movie";
import { NextResponse } from "next/server";

export const GET = async () => {
  const movies = await api.comtradaCineOrder.getMovies(Cinemas.zkm_karlsruhe);

  return new NextResponse(JSON.stringify(movies));
};

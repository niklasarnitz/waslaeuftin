import { NextResponse } from "next/server";

import { createCaller } from "@waslaeuftin/server/api/root";
import { createTRPCContext } from "@waslaeuftin/server/api/trpc";

export const GET = async (request: Request) => {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? "";

    const headers = new Headers(request.headers);
    const caller = createCaller(() =>
      createTRPCContext({
        headers,
        ip: headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown",
      }),
    );

    const results = await caller.cities.search(q);

    return NextResponse.json(results);
  } catch (error) {
    console.error("Search API error", error);
    return NextResponse.json(
      { message: "Search failed" },
      { status: 500 },
    );
  }
};

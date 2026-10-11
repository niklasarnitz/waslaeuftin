import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  scheduleCalendarDate,
  serializeCalendarDate,
} from "@waslaeuftin/helpers/calendarDate";

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/tomorrow") {
    const destination = request.nextUrl.clone();
    destination.pathname = "/";
    destination.searchParams.set(
      "date",
      serializeCalendarDate(scheduleCalendarDate(1)),
    );
    return NextResponse.redirect(destination);
  }

  const headers = new Headers(request.headers);

  headers.set("x-current-path", request.nextUrl.pathname);
  headers.set("x-search-params", request.nextUrl.searchParams.toString());

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: [
    // match all routes except static files and APIs
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};

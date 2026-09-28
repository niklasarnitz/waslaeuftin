import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  ADMIN_AUTH_REALM,
  isAdminEnabled,
  isAuthorizedAdmin,
} from "@waslaeuftin/helpers/adminAuth";

const isAdminPath = (pathname: string) =>
  pathname === "/admin" || pathname.startsWith("/admin/");

export function proxy(request: NextRequest) {
  if (isAdminPath(request.nextUrl.pathname)) {
    if (!isAdminEnabled()) {
      return new NextResponse("Not Found", { status: 404 });
    }
    if (!isAuthorizedAdmin(request.headers.get("authorization"))) {
      return new NextResponse("Authentication required", {
        status: 401,
        headers: { "WWW-Authenticate": ADMIN_AUTH_REALM },
      });
    }
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

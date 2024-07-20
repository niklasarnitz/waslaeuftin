import { type NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname, hostname } = request.nextUrl;

  // Determine locale based on hostname
  let locale = "de"; // Default to German

  if (hostname === "whatsshowing.in") {
    locale = "en";
  }

  // Determine new path based on locale
  let newPathname = pathname;

  if (locale === "en") {
    if (!pathname.startsWith("/uk")) {
      newPathname = `/uk${pathname}`;
    }
  } else {
    if (pathname.startsWith("/uk")) {
      newPathname = pathname.replace(/^\/uk/, "");
    }
  }

  // Rewrite the URL
  if (pathname !== newPathname) {
    return NextResponse.rewrite(new URL(newPathname, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

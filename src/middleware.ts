import { type NextRequest, NextResponse } from "next/server";
import acceptLanguage from "accept-language";
import { fallbackLocale, locales } from "@waslaeuftin/i18n/settings";
import { cookieName } from "@waslaeuftin/i18n/i18n";

acceptLanguage.languages(locales as unknown as string[]);

export const config = {
  // matcher: '/:lng*'
  matcher: [
    "/((?!api|_next/static|_next/image|assets|favicon.ico|sw.js|site.webmanifest).*)",
  ],
};

export function middleware(request: NextRequest) {
  let locale;
  if (request.cookies.has(cookieName))
    locale = acceptLanguage.get(request.cookies.get(cookieName)?.value);
  if (!locale)
    locale = acceptLanguage.get(request.headers.get("Accept-Language"));
  if (!locale) locale = fallbackLocale;

  // Redirect if lng in path is not supported
  if (
    !locales.some((loc) => request.nextUrl.pathname.startsWith(`/${loc}`)) &&
    !request.nextUrl.pathname.startsWith("/_next")
  ) {
    return NextResponse.redirect(
      new URL(`/${locale}${request.nextUrl.pathname}`, request.url),
    );
  }

  const referer = request.headers.get("referer");
  if (request.headers.has("referer") && referer) {
    const refererUrl = new URL(referer);
    const lngInReferer = locales.find((l) =>
      refererUrl.pathname.startsWith(`/${l}`),
    );
    const response = NextResponse.next();
    if (lngInReferer) response.cookies.set(cookieName, lngInReferer);
    return response;
  }

  return NextResponse.next();
}

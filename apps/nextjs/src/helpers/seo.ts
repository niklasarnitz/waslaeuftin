import type { Metadata } from "next";

export const SITE_URL = "https://waslaeuft.in";

export const listingPath = (kind: "city" | "cinema", slug: string) =>
  `/${kind}/${encodeURIComponent(slug)}`;

export function listingMetadata(
  path: string,
  hasUpcomingShowings: boolean,
  query: { date?: string; searchQuery?: string },
): Metadata {
  return {
    alternates: { canonical: path },
    robots: {
      index: hasUpcomingShowings && !query.date && !query.searchQuery,
      follow: true,
    },
  };
}

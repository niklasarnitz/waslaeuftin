import Link from "next/link";

import { listingPath } from "@waslaeuftin/helpers/seo";

export function ProgrammeBreadcrumbs({
  city,
  cinema,
}: {
  city: { name: string; slug: string };
  cinema?: { name: string };
}) {
  return (
    <nav
      aria-label="Brotkrümelnavigation"
      className="text-muted-foreground mb-3 flex flex-wrap gap-2 text-xs"
    >
      <Link href="/" className="hover:underline">
        wasläuft.in
      </Link>
      <span aria-hidden="true">/</span>
      {cinema ? (
        <>
          <Link
            href={listingPath("city", city.slug)}
            className="hover:underline"
          >
            Kinoprogramm {city.name}
          </Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{cinema.name}</span>
        </>
      ) : (
        <span aria-current="page">Kinoprogramm {city.name}</span>
      )}
    </nav>
  );
}

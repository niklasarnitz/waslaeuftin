import Link from "next/link";
import { MapPin } from "lucide-react";

import type { ListingCinemaEntry } from "@waslaeuftin/components/movie-listing/types";
import { formatDistance } from "@waslaeuftin/components/movie-listing/formatters";
import { ShowingTimePill } from "@waslaeuftin/components/movie-listing/ShowingTimePill";

type CinemaShowingsCardProps = {
  cinemaEntry: ListingCinemaEntry;
  movieName: string;
  maxShowings?: number;
};

export const CinemaShowingsCard = ({
  cinemaEntry,
  movieName,
  maxShowings = 5,
}: CinemaShowingsCardProps) => {
  return (
    <div className="border-border/70 bg-background/70 rounded-lg border p-2.5 sm:rounded-xl sm:p-3">
      <div className="text-muted-foreground mb-2 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs sm:text-sm">
        <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
        <Link
          href={cinemaEntry.cinema.href}
          className="font-medium hover:underline"
        >
          {cinemaEntry.cinema.name}
        </Link>
        {cinemaEntry.cinema.city && (
          <>
            <span className="text-foreground/40">•</span>
            <Link
              href={`/city/${cinemaEntry.cinema.city.slug}`}
              className="hover:underline"
            >
              {cinemaEntry.cinema.city.name}
            </Link>
          </>
        )}
        {cinemaEntry.cinema.distanceKm != null && (
          <>
            <span className="text-foreground/40">•</span>
            <span>{formatDistance(cinemaEntry.cinema.distanceKm)}</span>
          </>
        )}
      </div>

      <div className="flex gap-1.5 overflow-x-auto sm:flex-wrap sm:gap-2 sm:overflow-x-visible">
        {cinemaEntry.showings.slice(0, maxShowings).map((showing) => (
          <ShowingTimePill
            key={`${movieName}-${cinemaEntry.cinema.slug}-${showing.id}`}
            showing={showing}
            movieName={movieName}
            cinemaSlug={cinemaEntry.cinema.slug}
          />
        ))}
      </div>
    </div>
  );
};

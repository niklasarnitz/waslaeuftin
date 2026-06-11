import Link from "next/link";
import { Clock3 } from "lucide-react";

import type { ListingShowing } from "@waslaeuftin/components/movie-listing/types";
import { formatShowingTime } from "@waslaeuftin/components/movie-listing/formatters";
import { ShowingTags } from "@waslaeuftin/components/ShowingTags";

type ShowingTimePillProps = {
  showing: ListingShowing;
  movieName: string;
  cinemaSlug: string;
};

export const ShowingTimePill = ({
  showing,
  movieName,
  cinemaSlug,
}: ShowingTimePillProps) => {
  const formattedTime = formatShowingTime(showing.dateTime);
  const ariaLabelText = `Tickets für ${movieName} um ${formattedTime} Uhr buchen`;

  return (
    <Link
      key={`${movieName}-${cinemaSlug}-${showing.id}-${showing.dateTime.toISOString()}`}
      href={showing.bookingUrl ?? "#"}
      className="border-border/80 text-foreground hover:border-primary/50 hover:bg-primary/10 focus-visible:ring-ring inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none"
      aria-label={ariaLabelText}
      title={ariaLabelText}
    >
      <Clock3 className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
      <span>{formattedTime}</span>
      <ShowingTags
        showingId={showing.id}
        titleTags={showing.tags}
        additionalData={showing.showingAdditionalData}
      />
    </Link>
  );
};

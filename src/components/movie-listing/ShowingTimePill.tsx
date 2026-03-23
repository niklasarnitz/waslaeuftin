import Link from "next/link";
import { Clock3 } from "lucide-react";

import { ShowingTags } from "@waslaeuftin/components/ShowingTags";

import { formatTime } from "./formatters";
import type { ListingShowing } from "./types";

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
  return (
    <Link
      key={`${movieName}-${cinemaSlug}-${showing.id}-${showing.dateTime.toISOString()}`}
      href={showing.bookingUrl ?? "#"}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border/80 px-2.5 py-1 text-xs font-semibold text-foreground transition-colors hover:border-primary/50 hover:bg-primary/10"
    >
      <Clock3 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
      <span>{formatTime(showing.dateTime)}</span>
      <ShowingTags
        showingId={showing.id}
        titleTags={showing.tags}
        additionalData={showing.showingAdditionalData}
      />
    </Link>
  );
};

"use client";

import type { CinemaFilterOption } from "@waslaeuftin/components/movie-listing/types";

type CinemaFilterBarProps = {
  options: CinemaFilterOption[];
  selectedSlugs: string[];
  onToggle: (slug: string) => void;
  onClear: () => void;
};

export const CinemaFilterBar = ({
  options,
  selectedSlugs,
  onToggle,
  onClear,
}: CinemaFilterBarProps) => {
  const isActive = selectedSlugs.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
      <span className="text-foreground/60 text-[11px] font-semibold tracking-[0.14em] uppercase sm:text-xs">
        Nach Kino filtern
      </span>
      {options.map((cinema) => {
        const isSelected = selectedSlugs.includes(cinema.slug);

        return (
          <button
            key={cinema.id}
            type="button"
            onClick={() => onToggle(cinema.slug)}
            aria-pressed={isSelected}
            className={`focus-visible:ring-ring rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none sm:px-3 sm:py-1 sm:text-xs ${
              isSelected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border/80 bg-background/80 text-foreground hover:border-primary/50"
            }`}
          >
            {cinema.name}
          </button>
        );
      })}
      {isActive && (
        <button
          type="button"
          onClick={onClear}
          className="border-border/80 text-muted-foreground hover:border-primary/50 hover:text-foreground focus-visible:ring-ring rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none sm:px-3 sm:py-1 sm:text-xs"
        >
          Filter zurücksetzen
        </button>
      )}
    </div>
  );
};

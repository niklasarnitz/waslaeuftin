"use client";

import type { CinemaFilterOption } from "./types";

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
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/60 sm:text-xs">
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
            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-colors sm:px-3 sm:py-1 sm:text-xs ${
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
          className="rounded-full border border-border/80 px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground sm:px-3 sm:py-1 sm:text-xs"
        >
          Filter zurücksetzen
        </button>
      )}
    </div>
  );
};

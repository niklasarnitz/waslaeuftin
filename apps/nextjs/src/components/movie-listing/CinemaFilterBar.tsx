"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";

import type { CinemaFilterOption } from "@waslaeuftin/core";

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
  const [expanded, setExpanded] = useState(false);
  const optionsId = useId();
  // Keep selected cinemas visible even after closing the full list.
  const visibleOptions = expanded
    ? options
    : options.filter(
        (cinema, index) => index < 5 || selectedSlugs.includes(cinema.slug),
      );

  return (
    <div
      id={optionsId}
      className="flex flex-wrap items-center gap-1.5 sm:gap-2"
    >
      <span className="text-muted-foreground mr-1 text-xs font-medium">
        Nach Kino filtern
      </span>
      {visibleOptions.map((cinema) => {
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
      {options.length > 5 && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-controls={optionsId}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex min-h-8 items-center gap-1 rounded-md px-2 text-xs font-medium focus-visible:ring-2 focus-visible:outline-none"
        >
          {expanded ? "Weniger Kinos anzeigen" : "Alle Kinos anzeigen"}
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>
      )}
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

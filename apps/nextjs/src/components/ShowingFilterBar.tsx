"use client";

import React from "react";
import { ArrowUpDown, Clock, Filter } from "lucide-react";
import {
  TAG_OPTIONS,
  TIME_OPTIONS,
  type ShowingFilterOptions as WebShowingFilterOptions,
} from "@waslaeuftin/core";
import type { SortByOption } from "@waslaeuftin/hooks/useSortPreference";

export type { WebShowingFilterOptions };

interface ShowingFilterBarProps {
  filters: WebShowingFilterOptions;
  onChangeFilters: (filters: WebShowingFilterOptions) => void;
  sortBy?: SortByOption;
  onChangeSortBy?: (sortBy: SortByOption) => void;
}

export function ShowingFilterBar({
  filters,
  onChangeFilters,
  sortBy,
  onChangeSortBy,
}: ShowingFilterBarProps) {
  const toggleTag = (tagId: string) => {
    const exists = filters.selectedTags.includes(tagId);
    const newTags = exists
      ? filters.selectedTags.filter((t) => t !== tagId)
      : [...filters.selectedTags, tagId];
    onChangeFilters({ ...filters, selectedTags: newTags });
  };

  const selectTime = (timeId: WebShowingFilterOptions["timeWindow"]) => {
    onChangeFilters({ ...filters, timeWindow: timeId });
  };

  const activeCount =
    filters.selectedTags.length + (filters.timeWindow !== "all" ? 1 : 0);

  const resetFilters = () => {
    onChangeFilters({ selectedTags: [], timeWindow: "all" });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 py-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mr-1">
        <Filter className="w-3.5 h-3.5" />
        <span>Filter:</span>
      </div>

      {/* Active count & Reset */}
      {activeCount > 0 && (
        <button
          type="button"
          onClick={resetFilters}
          aria-label={`Filter zurücksetzen (${activeCount} aktiv)`}
          className="focus-visible:ring-ring inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/20 px-2.5 py-1 text-xs font-bold text-primary transition-colors hover:bg-primary/30 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none"
        >
          <span>✕ Zurücksetzen ({activeCount})</span>
        </button>
      )}

      {/* Format Tags */}
      {TAG_OPTIONS.map((opt) => {
        const isSelected = filters.selectedTags.includes(opt.id);
        return (
          <button
            key={`web-filter-tag-${opt.id}`}
            type="button"
            onClick={() => toggleTag(opt.id)}
            aria-pressed={isSelected}
            className={`focus-visible:ring-ring rounded-full border px-3 py-1 text-xs font-semibold transition-all focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none ${
              isSelected
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-muted/60 text-foreground border-border/60 hover:bg-muted"
            }`}
          >
            {opt.label}
          </button>
        );
      })}

      <div className="h-4 w-[1px] bg-border/60 mx-1 hidden sm:block" />

      {/* Time Windows */}
      {TIME_OPTIONS.filter((t) => t.id !== "all").map((timeOpt) => {
        const isSelected = filters.timeWindow === timeOpt.id;
        return (
          <button
            key={`web-filter-time-${timeOpt.id}`}
            type="button"
            onClick={() => selectTime(isSelected ? "all" : timeOpt.id)}
            aria-pressed={isSelected}
            className={`focus-visible:ring-ring inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition-all focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none ${
              isSelected
                ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                : "bg-muted/60 text-foreground border-border/60 hover:bg-muted"
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>{timeOpt.label}</span>
          </button>
        );
      })}

      {/* Sort Options */}
      {sortBy && onChangeSortBy && (
        <>
          <div className="h-4 w-[1px] bg-border/60 mx-1 hidden sm:block" />
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground sm:ml-auto">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sortierung:</span>
            <div className="inline-flex rounded-full bg-muted/80 p-0.5 border border-border/60">
              <button
                type="button"
                onClick={() => onChangeSortBy("popularity")}
                aria-pressed={sortBy === "popularity"}
                className={`focus-visible:ring-ring rounded-full px-2.5 py-0.5 text-xs font-semibold transition-all focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none ${
                  sortBy === "popularity"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Beliebtheit
              </button>
              <button
                type="button"
                onClick={() => onChangeSortBy("name")}
                aria-pressed={sortBy === "name"}
                className={`focus-visible:ring-ring rounded-full px-2.5 py-0.5 text-xs font-semibold transition-all focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none ${
                  sortBy === "name"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Name
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

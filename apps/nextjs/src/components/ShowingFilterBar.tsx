"use client";

import React from "react";
import { ArrowUpDown, Clock, Filter } from "lucide-react";

import type { ShowingFilterOptions as WebShowingFilterOptions } from "@waslaeuftin/core";
import type { SortByOption } from "@waslaeuftin/hooks/useSortPreference";
import { TAG_OPTIONS, TIME_OPTIONS } from "@waslaeuftin/core";

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
      <div className="text-muted-foreground mr-1 flex items-center gap-1.5 text-xs font-semibold">
        <Filter className="h-3.5 w-3.5" />
        <span>Filter:</span>
      </div>

      {/* Active count & Reset */}
      {activeCount > 0 && (
        <button
          onClick={resetFilters}
          className="bg-primary/20 text-primary border-primary/30 hover:bg-primary/30 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold transition-colors"
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
            onClick={() => toggleTag(opt.id)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
              isSelected
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-muted/60 text-foreground border-border/60 hover:bg-muted"
            }`}
          >
            {opt.label}
          </button>
        );
      })}

      <div className="bg-border/60 mx-1 hidden h-4 w-[1px] sm:block" />

      {/* Time Windows */}
      {TIME_OPTIONS.filter((t) => t.id !== "all").map((timeOpt) => {
        const isSelected = filters.timeWindow === timeOpt.id;
        return (
          <button
            key={`web-filter-time-${timeOpt.id}`}
            onClick={() => selectTime(isSelected ? "all" : timeOpt.id)}
            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
              isSelected
                ? "border-amber-600 bg-amber-600 text-white shadow-sm"
                : "bg-muted/60 text-foreground border-border/60 hover:bg-muted"
            }`}
          >
            <Clock className="h-3 w-3" />
            <span>{timeOpt.label}</span>
          </button>
        );
      })}

      {/* Sort Options */}
      {sortBy && onChangeSortBy && (
        <>
          <div className="bg-border/60 mx-1 hidden h-4 w-[1px] sm:block" />
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold sm:ml-auto">
            <ArrowUpDown className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sortierung:</span>
            <div className="bg-muted/80 border-border/60 inline-flex rounded-full border p-0.5">
              <button
                onClick={() => onChangeSortBy("popularity")}
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold transition-all ${
                  sortBy === "popularity"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Beliebtheit
              </button>
              <button
                onClick={() => onChangeSortBy("name")}
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold transition-all ${
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

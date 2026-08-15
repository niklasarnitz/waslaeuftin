"use client";

import React from "react";
import { Clock, Filter, X } from "lucide-react";

export type WebShowingFilterOptions = {
  selectedTags: string[];
  timeWindow: "all" | "14" | "18" | "21";
};

interface ShowingFilterBarProps {
  filters: WebShowingFilterOptions;
  onChangeFilters: (filters: WebShowingFilterOptions) => void;
}

const TAG_OPTIONS = [
  { id: "OV", label: "OV" },
  { id: "OmU", label: "OmU" },
  { id: "3D", label: "3D" },
  { id: "IMAX", label: "IMAX" },
  { id: "70mm/35mm", label: "70mm / 35mm" },
  { id: "Atmos", label: "Atmos" },
];

const TIME_OPTIONS: Array<{ id: WebShowingFilterOptions["timeWindow"]; label: string }> = [
  { id: "all", label: "Alle Zeiten" },
  { id: "14", label: "Ab 14:00" },
  { id: "18", label: "Ab 18:00" },
  { id: "21", label: "Ab 21:00" },
];

export function ShowingFilterBar({
  filters,
  onChangeFilters,
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
          onClick={resetFilters}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition-colors"
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
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
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
            onClick={() => selectTime(isSelected ? "all" : timeOpt.id)}
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
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
    </div>
  );
}

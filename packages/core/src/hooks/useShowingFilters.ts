"use client";

import { useState, useCallback } from "react";
import type { ShowingFilterOptions } from "../showingTags/categorizeShowingTags";

export const TAG_OPTIONS = [
  { id: "OV", label: "OV" },
  { id: "OmU", label: "OmU" },
  { id: "3D", label: "3D" },
  { id: "IMAX", label: "IMAX" },
  { id: "70mm/35mm", label: "70mm / 35mm" },
  { id: "Atmos", label: "Atmos" },
] as const;

export const TIME_OPTIONS: { id: ShowingFilterOptions["timeWindow"]; label: string }[] = [
  { id: "all", label: "Alle Zeiten" },
  { id: "14", label: "Ab 14:00" },
  { id: "18", label: "Ab 18:00" },
  { id: "21", label: "Ab 21:00" },
] as const;

export function useShowingFilters(
  initialFilters: ShowingFilterOptions = { selectedTags: [], timeWindow: "all" },
) {
  const [filters, setFilters] = useState<ShowingFilterOptions>(initialFilters);

  const toggleTag = useCallback((tagId: string) => {
    setFilters((prev) => {
      const exists = prev.selectedTags.includes(tagId);
      const newTags = exists
        ? prev.selectedTags.filter((t) => t !== tagId)
        : [...prev.selectedTags, tagId];
      return { ...prev, selectedTags: newTags };
    });
  }, []);

  const selectTime = useCallback((timeId: ShowingFilterOptions["timeWindow"]) => {
    setFilters((prev) => ({ ...prev, timeWindow: timeId }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({ selectedTags: [], timeWindow: "all" });
  }, []);

  const activeCount =
    filters.selectedTags.length + (filters.timeWindow !== "all" ? 1 : 0);

  return {
    filters,
    setFilters,
    toggleTag,
    selectTime,
    resetFilters,
    activeCount,
    TAG_OPTIONS,
    TIME_OPTIONS,
  };
}

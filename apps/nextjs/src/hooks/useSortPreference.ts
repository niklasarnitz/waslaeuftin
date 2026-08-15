"use client";

import { useEffect, useState } from "react";

export type SortByOption = "popularity" | "name";

const STORAGE_KEY = "waslaeuftin_sort_by";

export function useSortPreference(defaultSort: SortByOption = "popularity") {
  const [sortBy, setSortByState] = useState<SortByOption>(defaultSort);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "popularity" || stored === "name") {
        setSortByState(stored);
      }
    } catch {
      // ignore
    }
  }, []);

  const setSortBy = (newSortBy: SortByOption) => {
    setSortByState(newSortBy);
    try {
      localStorage.setItem(STORAGE_KEY, newSortBy);
    } catch {
      // ignore
    }
  };

  return [sortBy, setSortBy] as const;
}

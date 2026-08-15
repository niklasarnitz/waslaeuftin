import "expo-sqlite/localStorage/install";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

declare const localStorage: {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export const SEARCH_RADIUS_OPTIONS = [5, 10, 25, 50, 100] as const;
export const DEFAULT_SEARCH_RADIUS_KM = 25;

export type SortByOption = "popularity" | "name";

interface SettingsState {
  searchRadiusKm: number;
  setSearchRadiusKm: (km: number) => void;
  lastViewMode: "nearby" | "favorites";
  setLastViewMode: (mode: "nearby" | "favorites") => void;
  sortBy: SortByOption;
  setSortBy: (sortBy: SortByOption) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      searchRadiusKm: DEFAULT_SEARCH_RADIUS_KM,
      setSearchRadiusKm: (km) => set({ searchRadiusKm: km }),
      lastViewMode: "nearby",
      setLastViewMode: (mode) => set({ lastViewMode: mode }),
      sortBy: "popularity",
      setSortBy: (sortBy) => set({ sortBy }),
    }),
    {
      name: "waslaeuftin_settings",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

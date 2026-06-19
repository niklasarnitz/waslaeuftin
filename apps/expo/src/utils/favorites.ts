import "expo-sqlite/localStorage/install";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

declare const localStorage: {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

interface FavoritesState {
  favoriteCinemaIds: number[];
  toggleFavoriteCinema: (id: number) => void;
  isFavoriteCinema: (id: number) => boolean;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favoriteCinemaIds: [],
      toggleFavoriteCinema: (id) => {
        const current = get().favoriteCinemaIds;
        const exists = current.includes(id);
        const next = exists
          ? current.filter((x) => x !== id)
          : [...current, id];
        set({ favoriteCinemaIds: next });
      },
      isFavoriteCinema: (id) => get().favoriteCinemaIds.includes(id),
    }),
    {
      name: "waslaeuftin_favorites",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

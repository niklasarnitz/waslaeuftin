import "expo-sqlite/localStorage/install";

import * as Haptics from "expo-haptics";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface StoragePolyfill {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

declare const localStorage: StoragePolyfill;

export interface FavoriteCinema {
  id: number;
  name: string;
  slug: string;
}

interface FavoritesState {
  favorites: FavoriteCinema[];
  toggleFavorite: (cinema: FavoriteCinema) => void;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],
      toggleFavorite: (cinema) => {
        const current = get().favorites;
        const exists = current.some((x) => x.id === cinema.id);
        const updated = exists
          ? current.filter((x) => x.id !== cinema.id)
          : [...current, cinema];
        set({ favorites: updated });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {
          /* noop */
        });
      },
    }),
    {
      name: "waslaeuftin_favorites",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export const favoritesStore = {
  toggle(cinema: FavoriteCinema): void {
    useFavoritesStore.getState().toggleFavorite(cinema);
  },
};

export function useFavorites(): FavoriteCinema[] {
  return useFavoritesStore((state) => state.favorites);
}

export function useIsFavorite(id: number): boolean {
  return useFavoritesStore((state) => state.favorites.some((x) => x.id === id));
}

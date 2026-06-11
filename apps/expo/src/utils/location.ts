import "expo-sqlite/localStorage/install";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

declare const localStorage: {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export interface Coords {
  latitude: number;
  longitude: number;
}

interface LocationState {
  cachedCoords: Coords | null;
  setCoords: (coords: Coords) => void;
  clearCoords: () => void;
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      cachedCoords: null,
      setCoords: (coords) => set({ cachedCoords: coords }),
      clearCoords: () => set({ cachedCoords: null }),
    }),
    {
      name: "waslaeuftin_location",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

"use client";

import { toggleFavorite } from "@waslaeuftin/helpers/serverActions";
import { theme } from "@waslaeuftin/helpers/theme";
import { type api } from "@waslaeuftin/trpc/server";
import { StarIcon } from "lucide-react";

export const FavoriteButton = ({
  city,
  isFavorite,
}: {
  city: Awaited<ReturnType<typeof api.cities.getCityMoviesAndShowingsBySlug>>;
  isFavorite: boolean;
}) => {
  const toggleFavoriteWithCitySlug = toggleFavorite.bind(null, city?.slug);

  if (!city) {
    return null;
  }

  return (
    <button
      onClick={async () => {
        await toggleFavoriteWithCitySlug();
      }}
      className="flex items-center justify-center"
      aria-label={isFavorite ? "Favoriten entfernen" : "Favoriten hinzufügen"}
    >
      <StarIcon
        fill={
          isFavorite
            ? theme.theme.colors.yellow[500]
            : theme.theme.colors.transparent
        }
        stroke={
          isFavorite
            ? theme.theme.colors.yellow[500]
            : theme.theme.colors.slate[950]
        }
        className="h-6 w-6"
      />
    </button>
  );
};

"use client";

import { toggleFavorite } from "@waslaeuftin/helpers/serverActions";
import { theme } from "@waslaeuftin/helpers/theme";
import { type api } from "@waslaeuftin/trpc/server";
import { StarIcon } from "lucide-react";
import { useRouter } from "next/navigation";

export const FavoriteButton = ({
  city,
  isFavorite,
}: {
  city: Awaited<ReturnType<typeof api.cities.getCityBySlug>>;
  isFavorite: boolean;
}) => {
  const toggleFavoriteWithCitySlug = toggleFavorite.bind(null, city?.slug);

  const router = useRouter();

  if (!city) {
    return null;
  }

  return (
    <button
      onClick={async () => {
        await toggleFavoriteWithCitySlug();
        router.refresh();
      }}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/80 bg-background transition-colors hover:border-primary/40 hover:bg-primary/10"
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
        className="h-4 w-4"
      />
    </button>
  );
};

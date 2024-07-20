import { type Country } from "@prisma/client";

export const CountryToSlug = {
  DE_DE: "de",
  UK: "uk",
  IE: "ie",
} satisfies Record<Country, "de" | "uk" | "ie">;

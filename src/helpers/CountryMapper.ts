import { type Country } from "@prisma/client";

export const CountryToSlug = {
  DE_DE: "de",
  UK: "uk",
} satisfies Record<Country, "de" | "uk">;

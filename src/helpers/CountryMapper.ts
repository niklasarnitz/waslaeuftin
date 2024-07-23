import { type ValueOf } from "@ainias42/js-helper";
import { type Country } from "@prisma/client";
import { z } from "zod";

export const CountryToSlug = {
  DE_DE: "de",
  UK: "uk",
  IE: "ie",
} satisfies Record<Country, "de" | "uk" | "ie">;

export const CountrySlugToCountry = {
  de: "DE_DE",
  uk: "UK",
  ie: "IE",
} satisfies Record<ValueOf<typeof CountryToSlug>, Country>;

export const CountrySlugs = z.enum([
  CountryToSlug.DE_DE,
  CountryToSlug.UK,
  CountryToSlug.IE,
]);

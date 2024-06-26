"use server";

import { api } from "@waslaeuftin/trpc/server";
import { cookies } from "next/headers";

export async function toggleFavorite(citySlug?: string) {
  if (!citySlug) {
    return;
  }

  const isFavorite = cookies()
    .get("waslaeuftin-favorite-cities")
    ?.value.split(",")
    .includes(citySlug);

  cookies().set({
    name: "waslaeuftin-favorite-cities",
    value:
      cookies()
        .get("waslaeuftin-favorite-cities")
        ?.value.split(",")
        .filter((item) => item !== citySlug)
        .join(",")
        .concat(isFavorite ? "" : `,${citySlug}`) ?? "",
  });
}

export async function createCity(name?: string) {
  if (name && name.length > 0) {
    return await api.cities.createCity(name.toString());
  }
}

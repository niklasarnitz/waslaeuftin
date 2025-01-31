"use server";

import moment from "moment-timezone";
import { cookies } from "next/headers";

export async function toggleFavorite(citySlug?: string) {
  if (!citySlug) {
    return;
  }

  const isFavorite = (await cookies())
    .get("waslaeuftin-favorite-cities")
    ?.value.split(",")
    .includes(citySlug);

  const cookieExpiration = moment().add(2, "years");

  (await cookies()).set({
    name: "waslaeuftin-favorite-cities",
    value:
      (await cookies())
        .get("waslaeuftin-favorite-cities")
        ?.value.split(",")
        .filter((item) => item !== citySlug)
        .join(",")
        .concat(isFavorite ? "" : `,${citySlug}`) ?? "",
    maxAge: cookieExpiration.diff(moment()),
    expires: cookieExpiration.toDate(),
  });
}

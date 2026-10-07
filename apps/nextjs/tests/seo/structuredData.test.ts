import { expect, test } from "bun:test";

import {
  programmeBreadcrumbs,
  theaterData,
} from "@waslaeuftin/helpers/programmeStructuredData";

const city = { name: "Güglingen", slug: "güglingen" };
const cinema = {
  name: "Kino",
  slug: "kino_&_café",
  country: "GERMANY" as const,
  latitude: 49,
  longitude: 9,
};

test("cinema entities have stable encoded identities and stored coordinates", () => {
  const data = theaterData(cinema, city);
  expect(data["@id"]).toBe(
    "https://waslaeuft.in/cinema/kino_%26_caf%C3%A9#cinema",
  );
  expect(data.geo).toEqual({
    "@type": "GeoCoordinates",
    latitude: 49,
    longitude: 9,
  });
  expect(data.containedInPlace.name).toBe("Güglingen");
});

test("missing venue facts are omitted rather than fabricated", () => {
  const data = theaterData(
    { ...cinema, latitude: null, longitude: null },
    city,
  );
  expect(data).not.toHaveProperty("geo");
  expect(data).not.toHaveProperty("address");
  expect(data).not.toHaveProperty("image");
  expect(data).not.toHaveProperty("aggregateRating");
});

test("breadcrumbs reflect the existing homepage, city and cinema routes", () => {
  const items = programmeBreadcrumbs(city, cinema).itemListElement;
  expect(items.map((item) => item.position)).toEqual([1, 2, 3]);
  expect(items[1]?.item).toBe("https://waslaeuft.in/city/g%C3%BCglingen");
  expect(items[2]?.name).toBe("Kino");
});

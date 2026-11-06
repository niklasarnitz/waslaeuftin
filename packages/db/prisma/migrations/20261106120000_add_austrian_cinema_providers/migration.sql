ALTER TABLE "Cinema"
  ADD COLUMN "dieselKinoSlug" TEXT,
  ADD COLUMN "starMovieSlug" TEXT,
  ADD COLUMN "megaplexSlug" TEXT;

ALTER TABLE "Cinema" DROP CONSTRAINT "Cinema_native_provider_exclusive";
ALTER TABLE "Cinema" ADD CONSTRAINT "Cinema_native_provider_exclusive"
  CHECK (num_nonnulls("yorckCinemaId", "cinetixxCinemaId", "cineprogBaseUrl", "uciCinemaId",
                     "dieselKinoSlug", "starMovieSlug", "megaplexSlug") <= 1);

ALTER TABLE "Cinema" ADD CONSTRAINT "Cinema_austrian_native_country"
  CHECK (("dieselKinoSlug" IS NULL AND "starMovieSlug" IS NULL AND "megaplexSlug" IS NULL)
         OR "country" = 'AUSTRIA');

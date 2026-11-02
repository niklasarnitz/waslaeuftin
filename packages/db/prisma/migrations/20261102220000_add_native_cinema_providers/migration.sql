ALTER TABLE "Cinema"
  ADD COLUMN "yorckCinemaId" TEXT,
  ADD COLUMN "yorckCinemaSlug" TEXT,
  ADD COLUMN "cinetixxCinemaId" TEXT,
  ADD COLUMN "cineprogBaseUrl" TEXT,
  ADD COLUMN "uciCinemaId" TEXT,
  ADD COLUMN "uciCinemaSlug" TEXT;

ALTER TABLE "Showing"
  ADD COLUMN "providerSessionId" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "sourceMetadata" JSONB;

-- Legacy imports retain their existing slot identity (the empty session ID).
-- Native imports can retain simultaneous screenings in different auditoriums.
DROP INDEX "Showing_cinemaId_movieId_dateTime_key";
CREATE UNIQUE INDEX "Showing_cinemaId_movieId_dateTime_providerSessionId_key"
  ON "Showing"("cinemaId", "movieId", "dateTime", "providerSessionId");
CREATE INDEX "Showing_cinemaId_sourceProvider_providerSessionId_idx"
  ON "Showing"("cinemaId", "sourceProvider", "providerSessionId");

ALTER TABLE "Cinema" ADD CONSTRAINT "Cinema_native_provider_exclusive"
  CHECK (num_nonnulls("yorckCinemaId", "cinetixxCinemaId", "cineprogBaseUrl", "uciCinemaId") <= 1);
ALTER TABLE "Cinema" ADD CONSTRAINT "Cinema_yorck_mapping_complete"
  CHECK (("yorckCinemaId" IS NULL) = ("yorckCinemaSlug" IS NULL));
ALTER TABLE "Cinema" ADD CONSTRAINT "Cinema_uci_mapping_complete"
  CHECK (("uciCinemaId" IS NULL) = ("uciCinemaSlug" IS NULL));

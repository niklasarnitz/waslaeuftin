-- Add latitude/longitude columns to cinemas for map/geolocation usage
ALTER TABLE "Cinema"
ADD COLUMN "latitude" DOUBLE PRECISION,
ADD COLUMN "longitude" DOUBLE PRECISION;

-- Add combined geolocation index for location-based queries
CREATE INDEX "Cinema_latitude_longitude_idx" ON "Cinema"("latitude", "longitude");

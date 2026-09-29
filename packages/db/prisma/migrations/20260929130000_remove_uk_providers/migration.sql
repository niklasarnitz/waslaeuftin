-- Remove UK data (ODEON and Cineworld cinemas and their cities)
DELETE FROM "Showing" WHERE "cinemaId" IN (SELECT "id" FROM "Cinema" WHERE "country" = 'UNITED_KINGDOM');
DELETE FROM "Cinema" WHERE "country" = 'UNITED_KINGDOM';
DELETE FROM "City" WHERE "country" = 'UNITED_KINGDOM';
UPDATE "Device" SET "country" = NULL WHERE "country" = 'UNITED_KINGDOM';

-- DropIndex
DROP INDEX IF EXISTS "Cinema_boxofficeTheaterId_idx";

-- AlterTable
ALTER TABLE "Cinema" DROP COLUMN "boxofficeDomain",
DROP COLUMN "boxofficeTheaterId",
DROP COLUMN "odeonCinemaId";

-- AlterEnum
BEGIN;
CREATE TYPE "Countries_new" AS ENUM ('GERMANY', 'AUSTRIA');
ALTER TABLE "Cinema" ALTER COLUMN "country" TYPE "Countries_new" USING ("country"::text::"Countries_new");
ALTER TABLE "City" ALTER COLUMN "country" TYPE "Countries_new" USING ("country"::text::"Countries_new");
ALTER TABLE "Device" ALTER COLUMN "country" TYPE "Countries_new" USING ("country"::text::"Countries_new");
ALTER TYPE "Countries" RENAME TO "Countries_old";
ALTER TYPE "Countries_new" RENAME TO "Countries";
DROP TYPE "Countries_old";
COMMIT;

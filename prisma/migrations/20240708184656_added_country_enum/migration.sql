-- CreateEnum
CREATE TYPE "Country" AS ENUM ('DE_DE', 'UK');

-- AlterTable
ALTER TABLE "City" ADD COLUMN     "country" "Country" NOT NULL DEFAULT 'DE_DE';

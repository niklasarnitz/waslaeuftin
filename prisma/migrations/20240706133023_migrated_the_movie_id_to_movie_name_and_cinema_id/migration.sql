/*
  Warnings:

  - The primary key for the `Movie` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Movie` table. All the data in the column will be lost.
  - You are about to drop the column `movieId` on the `Showing` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[cinemaId,name]` on the table `Movie` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `cinemaId` to the `Showing` table without a default value. This is not possible if the table is not empty.
  - Added the required column `movieName` to the `Showing` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Showing" DROP CONSTRAINT "Showing_movieId_fkey";

-- DropIndex
DROP INDEX "Movie_name_idx";

-- DropIndex
DROP INDEX "Showing_movieId_idx";

-- AlterTable
ALTER TABLE "Movie" DROP CONSTRAINT "Movie_pkey",
DROP COLUMN "id";

-- AlterTable
ALTER TABLE "Showing" DROP COLUMN "movieId",
ADD COLUMN     "cinemaId" INTEGER NOT NULL,
ADD COLUMN     "movieName" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Movie_cinemaId_name_idx" ON "Movie"("cinemaId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Movie_cinemaId_name_key" ON "Movie"("cinemaId", "name");

-- CreateIndex
CREATE INDEX "Showing_movieName_cinemaId_idx" ON "Showing"("movieName", "cinemaId");

-- AddForeignKey
ALTER TABLE "Showing" ADD CONSTRAINT "Showing_movieName_cinemaId_fkey" FOREIGN KEY ("movieName", "cinemaId") REFERENCES "Movie"("name", "cinemaId") ON DELETE RESTRICT ON UPDATE CASCADE;

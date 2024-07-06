-- DropForeignKey
ALTER TABLE "Cinema" DROP CONSTRAINT "Cinema_cinemaxxVueCinemasMetadataId_fkey";

-- DropForeignKey
ALTER TABLE "Cinema" DROP CONSTRAINT "Cinema_comtradaCineOrderMetadataId_fkey";

-- DropForeignKey
ALTER TABLE "Cinema" DROP CONSTRAINT "Cinema_kinoHeldCinemasMetadataId_fkey";

-- DropForeignKey
ALTER TABLE "Movie" DROP CONSTRAINT "Movie_cinemaId_fkey";

-- DropForeignKey
ALTER TABLE "Showing" DROP CONSTRAINT "Showing_movieName_cinemaId_fkey";

-- AddForeignKey
ALTER TABLE "Showing" ADD CONSTRAINT "Showing_movieName_cinemaId_fkey" FOREIGN KEY ("movieName", "cinemaId") REFERENCES "Movie"("name", "cinemaId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movie" ADD CONSTRAINT "Movie_cinemaId_fkey" FOREIGN KEY ("cinemaId") REFERENCES "Cinema"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cinema" ADD CONSTRAINT "Cinema_cinemaxxVueCinemasMetadataId_fkey" FOREIGN KEY ("cinemaxxVueCinemasMetadataId") REFERENCES "CinemaxxVueCinemasMetadata"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cinema" ADD CONSTRAINT "Cinema_comtradaCineOrderMetadataId_fkey" FOREIGN KEY ("comtradaCineOrderMetadataId") REFERENCES "ComtradaCineOrderMetadata"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cinema" ADD CONSTRAINT "Cinema_kinoHeldCinemasMetadataId_fkey" FOREIGN KEY ("kinoHeldCinemasMetadataId") REFERENCES "KinoHeldCinemasMetadata"("id") ON DELETE CASCADE ON UPDATE CASCADE;

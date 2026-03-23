-- CreateIndex
CREATE UNIQUE INDEX "Showing_cinemaId_movieId_dateTime_key" ON "Showing"("cinemaId", "movieId", "dateTime");

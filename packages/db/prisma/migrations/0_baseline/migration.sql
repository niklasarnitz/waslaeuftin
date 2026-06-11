-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Countries" AS ENUM ('GERMANY', 'AUSTRIA');

-- CreateTable
CREATE TABLE "Showing" (
    "id" SERIAL NOT NULL,
    "dateTime" TIMESTAMP(3) NOT NULL,
    "bookingUrl" TEXT,
    "showingAdditionalData" TEXT[],
    "rawMovieName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cinemaId" INTEGER NOT NULL,
    "movieId" INTEGER NOT NULL,

    CONSTRAINT "Showing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Movie" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedTitle" TEXT NOT NULL,
    "canonicalKey" TEXT NOT NULL,
    "coverUrl" TEXT,
    "coverStorageKey" TEXT,
    "coverConfidence" DOUBLE PRECISION,
    "tmdbMovieId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Movie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TmdbMetadata" (
    "tmdbId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "originalTitle" TEXT NOT NULL,
    "originalLanguage" TEXT NOT NULL,
    "overview" TEXT,
    "tagline" TEXT,
    "posterPath" TEXT,
    "backdropPath" TEXT,
    "releaseDate" TEXT,
    "runtime" INTEGER,
    "budget" INTEGER,
    "revenue" INTEGER,
    "popularity" DOUBLE PRECISION,
    "voteAverage" DOUBLE PRECISION,
    "voteCount" INTEGER,
    "status" TEXT,
    "adult" BOOLEAN,
    "video" BOOLEAN,
    "homepage" TEXT,
    "imdbId" TEXT,
    "genres" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TmdbMetadata_pkey" PRIMARY KEY ("tmdbId")
);

-- CreateTable
CREATE TABLE "ComtradaCineOrderMetadata" (
    "id" SERIAL NOT NULL,
    "backendUrl" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "centerShorty" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComtradaCineOrderMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KinoHeldCinemasMetadata" (
    "id" SERIAL NOT NULL,
    "centerId" TEXT NOT NULL,
    "centerShorty" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KinoHeldCinemasMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CinemaxxVueCinemasMetadata" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cinemaId" INTEGER NOT NULL,

    CONSTRAINT "CinemaxxVueCinemasMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cinema" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "comtradaCineOrderMetadataId" INTEGER,
    "isKinoTicketsExpress" BOOLEAN,
    "kinoHeldCinemasMetadataId" INTEGER,
    "cityId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cinemaxxVueCinemasMetadataId" INTEGER,
    "premiumKinoSubdomain" TEXT,
    "cineStarCinemaId" INTEGER,
    "cineplexCinemaId" TEXT,
    "cineplexxAtCinemaId" TEXT,
    "myVueCinemaId" TEXT,
    "lastFetchedAt" TIMESTAMP(3),
    "country" "Countries" NOT NULL DEFAULT 'GERMANY',

    CONSTRAINT "Cinema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "City" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Showing_cinemaId_dateTime_idx" ON "Showing"("cinemaId", "dateTime");

-- CreateIndex
CREATE INDEX "Showing_movieId_dateTime_idx" ON "Showing"("movieId", "dateTime");

-- CreateIndex
CREATE INDEX "Showing_movieId_cinemaId_idx" ON "Showing"("movieId", "cinemaId");

-- CreateIndex
CREATE UNIQUE INDEX "Showing_cinemaId_movieId_dateTime_key" ON "Showing"("cinemaId", "movieId", "dateTime");

-- CreateIndex
CREATE UNIQUE INDEX "Movie_canonicalKey_key" ON "Movie"("canonicalKey");

-- CreateIndex
CREATE UNIQUE INDEX "Movie_tmdbMovieId_key" ON "Movie"("tmdbMovieId");

-- CreateIndex
CREATE INDEX "Movie_name_idx" ON "Movie"("name");

-- CreateIndex
CREATE INDEX "Movie_normalizedTitle_idx" ON "Movie"("normalizedTitle");

-- CreateIndex
CREATE INDEX "Cinema_name_idx" ON "Cinema"("name");

-- CreateIndex
CREATE INDEX "Cinema_latitude_longitude_idx" ON "Cinema"("latitude", "longitude");

-- CreateIndex
CREATE UNIQUE INDEX "Cinema_cityId_slug_key" ON "Cinema"("cityId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "City_name_key" ON "City"("name");

-- CreateIndex
CREATE UNIQUE INDEX "City_slug_key" ON "City"("slug");

-- CreateIndex
CREATE INDEX "City_name_idx" ON "City"("name");

-- AddForeignKey
ALTER TABLE "Showing" ADD CONSTRAINT "Showing_cinemaId_fkey" FOREIGN KEY ("cinemaId") REFERENCES "Cinema"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Showing" ADD CONSTRAINT "Showing_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movie" ADD CONSTRAINT "Movie_tmdbMovieId_fkey" FOREIGN KEY ("tmdbMovieId") REFERENCES "TmdbMetadata"("tmdbId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cinema" ADD CONSTRAINT "Cinema_cinemaxxVueCinemasMetadataId_fkey" FOREIGN KEY ("cinemaxxVueCinemasMetadataId") REFERENCES "CinemaxxVueCinemasMetadata"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cinema" ADD CONSTRAINT "Cinema_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cinema" ADD CONSTRAINT "Cinema_comtradaCineOrderMetadataId_fkey" FOREIGN KEY ("comtradaCineOrderMetadataId") REFERENCES "ComtradaCineOrderMetadata"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cinema" ADD CONSTRAINT "Cinema_kinoHeldCinemasMetadataId_fkey" FOREIGN KEY ("kinoHeldCinemasMetadataId") REFERENCES "KinoHeldCinemasMetadata"("id") ON DELETE CASCADE ON UPDATE CASCADE;


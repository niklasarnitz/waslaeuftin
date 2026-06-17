-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "expoPushToken" TEXT,
    "country" "Countries",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceCinemaPopularity" (
    "id" SERIAL NOT NULL,
    "deviceId" TEXT NOT NULL,
    "cinemaId" INTEGER NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceCinemaPopularity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reminder" (
    "id" SERIAL NOT NULL,
    "deviceId" TEXT NOT NULL,
    "tmdbMovieId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "posterPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notifiedAt" TIMESTAMP(3),

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeviceCinemaPopularity_deviceId_count_idx" ON "DeviceCinemaPopularity"("deviceId", "count");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceCinemaPopularity_deviceId_cinemaId_key" ON "DeviceCinemaPopularity"("deviceId", "cinemaId");

-- CreateIndex
CREATE INDEX "Reminder_tmdbMovieId_idx" ON "Reminder"("tmdbMovieId");

-- CreateIndex
CREATE INDEX "Reminder_notifiedAt_idx" ON "Reminder"("notifiedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Reminder_deviceId_tmdbMovieId_key" ON "Reminder"("deviceId", "tmdbMovieId");

-- AddForeignKey
ALTER TABLE "DeviceCinemaPopularity" ADD CONSTRAINT "DeviceCinemaPopularity_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceCinemaPopularity" ADD CONSTRAINT "DeviceCinemaPopularity_cinemaId_fkey" FOREIGN KEY ("cinemaId") REFERENCES "Cinema"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

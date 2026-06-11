-- AlterTable
ALTER TABLE "Cinema" ADD COLUMN "cinfinityCinemaId" TEXT;

-- CreateIndex
CREATE INDEX "Cinema_cinfinityCinemaId_idx" ON "Cinema"("cinfinityCinemaId");

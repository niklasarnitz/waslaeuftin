-- AlterTable
ALTER TABLE "Cinema" ADD COLUMN "boxofficeDomain" TEXT,
ADD COLUMN "boxofficeTheaterId" TEXT;

-- CreateIndex
CREATE INDEX "Cinema_boxofficeTheaterId_idx" ON "Cinema"("boxofficeTheaterId");

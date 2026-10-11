ALTER TABLE "Showing"
ADD COLUMN "sourceProvider" TEXT,
ADD COLUMN "providerFilmId" TEXT,
ADD COLUMN "sourceEvidence" JSONB,
ADD COLUMN "matcherVersion" INTEGER,
ADD COLUMN "matchEvaluatedAt" TIMESTAMP(3),
ADD COLUMN "matchEvaluation" JSONB;

CREATE INDEX "Showing_cinemaId_sourceProvider_providerFilmId_idx"
ON "Showing"("cinemaId", "sourceProvider", "providerFilmId");

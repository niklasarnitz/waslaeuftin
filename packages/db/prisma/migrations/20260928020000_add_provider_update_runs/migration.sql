-- CreateEnum
CREATE TYPE "ProviderUpdateRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "ProviderUpdateRunPhase" AS ENUM ('QUEUED', 'FETCHING', 'MATCHING', 'TMDB', 'PERSISTING', 'DONE');

-- CreateTable
CREATE TABLE "ProviderUpdateRun" (
    "id" SERIAL NOT NULL,
    "batchId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "status" "ProviderUpdateRunStatus" NOT NULL DEFAULT 'QUEUED',
    "phase" "ProviderUpdateRunPhase" NOT NULL DEFAULT 'QUEUED',
    "phaseTotal" INTEGER NOT NULL DEFAULT 0,
    "phaseDone" INTEGER NOT NULL DEFAULT 0,
    "cinemasTotal" INTEGER NOT NULL DEFAULT 0,
    "cinemasProcessed" INTEGER NOT NULL DEFAULT 0,
    "cinemasFailed" INTEGER NOT NULL DEFAULT 0,
    "moviesFetched" INTEGER,
    "showingsFetched" INTEGER,
    "showingsCreated" INTEGER,
    "canonicalMovies" INTEGER,
    "tmdbMatched" INTEGER,
    "tmdbUnmatched" INTEGER,
    "error" TEXT,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderUpdateRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProviderUpdateRun_provider_queuedAt_idx" ON "ProviderUpdateRun"("provider", "queuedAt");

-- CreateIndex
CREATE INDEX "ProviderUpdateRun_batchId_idx" ON "ProviderUpdateRun"("batchId");

-- CreateIndex
CREATE INDEX "ProviderUpdateRun_status_idx" ON "ProviderUpdateRun"("status");

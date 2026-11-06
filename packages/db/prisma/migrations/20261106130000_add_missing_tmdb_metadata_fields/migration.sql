-- Complete the existing TmdbMetadata model without rewriting applied migrations.
-- Preserve compatible columns/data on databases where enrichment already exists.
ALTER TABLE "TmdbMetadata"
  ADD COLUMN IF NOT EXISTS "certification" TEXT,
  ADD COLUMN IF NOT EXISTS "trailerUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "rawDetails" JSONB,
  ADD COLUMN IF NOT EXISTS "directors" JSONB,
  ADD COLUMN IF NOT EXISTS "cast" JSONB,
  ADD COLUMN IF NOT EXISTS "crew" JSONB,
  ADD COLUMN IF NOT EXISTS "productionCompanies" JSONB,
  ADD COLUMN IF NOT EXISTS "productionCountries" JSONB,
  ADD COLUMN IF NOT EXISTS "spokenLanguages" JSONB,
  ADD COLUMN IF NOT EXISTS "collectionJson" JSONB,
  ADD COLUMN IF NOT EXISTS "keywordsJson" JSONB;

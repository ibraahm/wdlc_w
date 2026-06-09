-- AlterTable: add payoutDetails column with default empty JSON object
-- IF NOT EXISTS guards against re-running on a DB built from the init migration
-- which already includes this column.
ALTER TABLE "NetworkCountry" ADD COLUMN IF NOT EXISTS "payoutDetails" TEXT NOT NULL DEFAULT '{}';

-- AlterTable: add payoutDetails column with default empty JSON object
ALTER TABLE "NetworkCountry" ADD COLUMN "payoutDetails" TEXT NOT NULL DEFAULT '{}';

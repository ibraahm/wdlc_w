-- Per-resource download gate: view-only in the portal unless explicitly allowed.
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "allowDownload" BOOLEAN NOT NULL DEFAULT false;

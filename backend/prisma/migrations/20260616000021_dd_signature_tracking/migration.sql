-- Manual document-signature tracking on a DD file (sent/signed by hand,
-- independent of DocuSign).

CREATE TABLE IF NOT EXISTS "DDSignatureDoc" (
  "id"        TEXT NOT NULL,
  "ddFileId"  TEXT NOT NULL,
  "label"     TEXT NOT NULL,
  "status"    TEXT NOT NULL DEFAULT 'PENDING',
  "method"    TEXT,
  "sentAt"    TIMESTAMP(3),
  "signedAt"  TIMESTAMP(3),
  "notes"     TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DDSignatureDoc_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DDSignatureDoc_ddFileId_idx" ON "DDSignatureDoc"("ddFileId");

DO $$ BEGIN
  ALTER TABLE "DDSignatureDoc" ADD CONSTRAINT "DDSignatureDoc_ddFileId_fkey"
    FOREIGN KEY ("ddFileId") REFERENCES "AgentDDFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

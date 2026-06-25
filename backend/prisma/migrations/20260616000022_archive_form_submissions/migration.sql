-- Archive support for website form submissions (reversibly hide test/duplicate
-- entries from the active inbox while keeping the record).

ALTER TABLE "FormSubmission" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);
ALTER TABLE "FormSubmission" ADD COLUMN IF NOT EXISTS "archivedBy" TEXT;

CREATE INDEX IF NOT EXISTS "FormSubmission_archivedAt_idx" ON "FormSubmission"("archivedAt");

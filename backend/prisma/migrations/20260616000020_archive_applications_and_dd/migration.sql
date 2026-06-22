-- Archive support for agent applications and their DD files.
-- Archiving hides a record from the active queues while preserving it (and its
-- audit trail) for compliance. Reversible via un-archive.

ALTER TABLE "AgentApplication" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);
ALTER TABLE "AgentApplication" ADD COLUMN IF NOT EXISTS "archivedBy" TEXT;

ALTER TABLE "AgentDDFile" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);
ALTER TABLE "AgentDDFile" ADD COLUMN IF NOT EXISTS "archivedBy" TEXT;

CREATE INDEX IF NOT EXISTS "AgentApplication_archivedAt_idx" ON "AgentApplication"("archivedAt");
CREATE INDEX IF NOT EXISTS "AgentDDFile_archivedAt_idx" ON "AgentDDFile"("archivedAt");

-- Phase 5: time-bound auditor role + training exceptions workflow

ALTER TABLE "AdminUser" ADD COLUMN IF NOT EXISTS "accessExpiresAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "TrainingException" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "agentId" TEXT,
  "branchCode" TEXT,
  "type" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "note" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "expiresAt" TIMESTAMP(3),
  "requestedBy" TEXT,
  "decidedBy" TEXT,
  "decidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrainingException_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "TrainingException_courseId_status_idx" ON "TrainingException"("courseId", "status");
CREATE INDEX IF NOT EXISTS "TrainingException_agentId_status_idx" ON "TrainingException"("agentId", "status");
CREATE INDEX IF NOT EXISTS "TrainingException_branchCode_status_idx" ON "TrainingException"("branchCode", "status");

DO $$ BEGIN
  ALTER TABLE "TrainingException" ADD CONSTRAINT "TrainingException_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "TrainingException" ADD CONSTRAINT "TrainingException_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AgentUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

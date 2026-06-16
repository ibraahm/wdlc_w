-- Phase 3: explicit, admin-driven training assignments (additive on audience)

CREATE TABLE IF NOT EXISTS "TrainingAssignment" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "agentId" TEXT,
  "branchCode" TEXT,
  "reason" TEXT NOT NULL,
  "note" TEXT,
  "dueAt" TIMESTAMP(3),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "assignedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrainingAssignment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "TrainingAssignment_courseId_active_idx" ON "TrainingAssignment"("courseId", "active");
CREATE INDEX IF NOT EXISTS "TrainingAssignment_agentId_active_idx" ON "TrainingAssignment"("agentId", "active");
CREATE INDEX IF NOT EXISTS "TrainingAssignment_branchCode_active_idx" ON "TrainingAssignment"("branchCode", "active");

DO $$ BEGIN
  ALTER TABLE "TrainingAssignment" ADD CONSTRAINT "TrainingAssignment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "TrainingAssignment" ADD CONSTRAINT "TrainingAssignment_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AgentUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Phase 2: course content versioning + policy acknowledgments (append-only)

-- Course: policy acknowledgment controls
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "requireAck" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS "policyStatement" TEXT;

-- CourseCompletion: stamp the assessed content version
ALTER TABLE "CourseCompletion" ADD COLUMN IF NOT EXISTS "courseVersionId" TEXT;
ALTER TABLE "CourseCompletion" ADD COLUMN IF NOT EXISTS "versionNumber" INTEGER;

-- Append-only content snapshots
CREATE TABLE IF NOT EXISTS "CourseVersion" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "contentHtml" TEXT NOT NULL DEFAULT '',
  "questions" TEXT NOT NULL DEFAULT '[]',
  "outline" TEXT NOT NULL DEFAULT '[]',
  "contentHash" TEXT NOT NULL,
  "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "note" TEXT,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CourseVersion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CourseVersion_courseId_version_key" ON "CourseVersion"("courseId", "version");
CREATE INDEX IF NOT EXISTS "CourseVersion_courseId_idx" ON "CourseVersion"("courseId");

-- Append-only attestations
CREATE TABLE IF NOT EXISTS "PolicyAcknowledgment" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "courseVersionId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "agentId" TEXT NOT NULL,
  "statement" TEXT NOT NULL,
  "branchCode" TEXT,
  "ip" TEXT,
  "userAgent" TEXT,
  "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PolicyAcknowledgment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PolicyAcknowledgment_agentId_courseVersionId_key" ON "PolicyAcknowledgment"("agentId", "courseVersionId");
CREATE INDEX IF NOT EXISTS "PolicyAcknowledgment_courseId_idx" ON "PolicyAcknowledgment"("courseId");
CREATE INDEX IF NOT EXISTS "PolicyAcknowledgment_agentId_idx" ON "PolicyAcknowledgment"("agentId");

-- Foreign keys (referential integrity for the new append-only tables)
DO $$ BEGIN
  ALTER TABLE "CourseVersion" ADD CONSTRAINT "CourseVersion_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "PolicyAcknowledgment" ADD CONSTRAINT "PolicyAcknowledgment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "PolicyAcknowledgment" ADD CONSTRAINT "PolicyAcknowledgment_courseVersionId_fkey" FOREIGN KEY ("courseVersionId") REFERENCES "CourseVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "PolicyAcknowledgment" ADD CONSTRAINT "PolicyAcknowledgment_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AgentUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "CourseCompletion" ADD CONSTRAINT "CourseCompletion_courseVersionId_fkey" FOREIGN KEY ("courseVersionId") REFERENCES "CourseVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Regional offices + branch hierarchy + scoping fields

CREATE TABLE IF NOT EXISTS "RegionalOffice" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "states" TEXT,
  "contactEmail" TEXT,
  "contactPhone" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RegionalOffice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "RegionalOffice_code_key" ON "RegionalOffice"("code");
CREATE INDEX IF NOT EXISTS "RegionalOffice_active_idx" ON "RegionalOffice"("active");

-- Scope a REGIONAL_OFFICER admin user to an office
ALTER TABLE "AdminUser" ADD COLUMN IF NOT EXISTS "regionalOfficeId" TEXT;

-- DD file: regional office FK + branch hierarchy
ALTER TABLE "AgentDDFile" ADD COLUMN IF NOT EXISTS "regionalOfficeId" TEXT;
ALTER TABLE "AgentDDFile" ADD COLUMN IF NOT EXISTS "branchType" TEXT NOT NULL DEFAULT 'AGENT';
ALTER TABLE "AgentDDFile" ADD COLUMN IF NOT EXISTS "parentBranchId" TEXT;
CREATE INDEX IF NOT EXISTS "AgentDDFile_regionalOfficeId_idx" ON "AgentDDFile"("regionalOfficeId");

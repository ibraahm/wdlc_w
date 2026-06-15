-- Risk assessments per agent DD file

CREATE TABLE IF NOT EXISTS "RiskAssessment" (
  "id" TEXT NOT NULL,
  "ddFileId" TEXT NOT NULL,
  "branchCode" TEXT,
  "regionalOfficeId" TEXT,
  "factors" TEXT NOT NULL DEFAULT '[]',
  "score" INTEGER NOT NULL,
  "rating" TEXT NOT NULL,
  "notes" TEXT,
  "assessedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RiskAssessment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "RiskAssessment_ddFileId_createdAt_idx" ON "RiskAssessment"("ddFileId", "createdAt");
CREATE INDEX IF NOT EXISTS "RiskAssessment_regionalOfficeId_idx" ON "RiskAssessment"("regionalOfficeId");

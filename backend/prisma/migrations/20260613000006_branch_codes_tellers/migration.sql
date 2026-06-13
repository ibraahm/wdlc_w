-- Agent branch codes + teller applications + anticipated dollar volume
ALTER TABLE "AgentDDFile" ADD COLUMN IF NOT EXISTS "branchCode" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "AgentDDFile_branchCode_key" ON "AgentDDFile"("branchCode");
ALTER TABLE "AgentUser" ADD COLUMN IF NOT EXISTS "branchCode" TEXT;
ALTER TABLE "AgentUser" ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'PRINCIPAL';
ALTER TABLE "AgentApplication" ADD COLUMN IF NOT EXISTS "anticipatedDollarVolume" TEXT;

CREATE TABLE IF NOT EXISTS "TellerApplication" (
  "id" TEXT NOT NULL,
  "branchCode" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "addressLine" TEXT,
  "city" TEXT,
  "state" TEXT,
  "zip" TEXT,
  "signatureName" TEXT,
  "signatureConsent" BOOLEAN NOT NULL DEFAULT false,
  "signatureIp" TEXT,
  "signatureUserAgent" TEXT,
  "status" TEXT NOT NULL DEFAULT 'NEW',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TellerApplication_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "TellerApplication_branchCode_idx" ON "TellerApplication"("branchCode");
CREATE INDEX IF NOT EXISTS "TellerApplication_status_idx" ON "TellerApplication"("status");

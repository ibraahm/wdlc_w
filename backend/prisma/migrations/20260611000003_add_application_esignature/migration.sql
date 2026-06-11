ALTER TABLE "AgentApplication"
  ADD COLUMN "signatureName" TEXT,
  ADD COLUMN "signatureTitle" TEXT,
  ADD COLUMN "signatureConsent" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "signatureConsentText" TEXT,
  ADD COLUMN "signatureClientTimestamp" TIMESTAMP(3),
  ADD COLUMN "signatureAcceptedAt" TIMESTAMP(3),
  ADD COLUMN "signatureIp" TEXT,
  ADD COLUMN "signatureUserAgent" TEXT;

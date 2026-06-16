-- Privacy-respecting visit analytics across web / portal / admin

CREATE TABLE IF NOT EXISTS "VisitEvent" (
  "id" TEXT NOT NULL,
  "portal" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "country" TEXT,
  "region" TEXT,
  "city" TEXT,
  "ipHash" TEXT,
  "referrer" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VisitEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "VisitEvent_createdAt_idx" ON "VisitEvent"("createdAt");
CREATE INDEX IF NOT EXISTS "VisitEvent_portal_createdAt_idx" ON "VisitEvent"("portal", "createdAt");
CREATE INDEX IF NOT EXISTS "VisitEvent_country_idx" ON "VisitEvent"("country");
